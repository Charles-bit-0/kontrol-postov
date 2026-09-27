const API_URL =
  "https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";

let scanner = null;
let posts = [];
let employees = [];

let currentPost = null;
let currentEmployee = null;

let shiftStarted = false;
let lastCheckTime = null;
let nextCheckTime = null;

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
  bindButtons();
  restoreState();
  updateTime();
  setInterval(updateTime, 1000);

  await loadData();
  updateMainScreen();
});


/* =========================
   КНОПКИ
========================= */

function bindButtons() {
  const scanBtn = $("scanBtn");
  if (scanBtn) {
    scanBtn.addEventListener("click", startScanner);
  }

  const demoBtn = $("demoBtn");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      openPost("P-001");
    });
  }

  const closeBtn = $("closeBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePost);
  }

  const shiftBtn = $("shiftBtn");
  if (shiftBtn) {
    shiftBtn.addEventListener("click", startShift);
  }

  const saveBtn = $("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCheck);
  }

  const incidentBtn = $("incidentBtn");
  if (incidentBtn) {
    incidentBtn.addEventListener("click", openIncident);
  }

  const incidentSaveBtn = $("incidentSaveBtn");
  if (incidentSaveBtn) {
    incidentSaveBtn.addEventListener("click", saveIncident);
  }

  const incidentCloseBtn = $("incidentCloseBtn");
  if (incidentCloseBtn) {
    incidentCloseBtn.addEventListener("click", closeIncident);
  }
}


/* =========================
   ЗАГРУЗКА ДАННЫХ
========================= */

async function loadData() {
  try {
    setText("apiStatus", "Подключение...");

    const postsResponse = await fetch(API_URL + "?action=posts");
    const postsData = await postsResponse.json();

    if (postsData.ok && Array.isArray(postsData.data)) {
      posts = postsData.data;
    } else if (Array.isArray(postsData)) {
      posts = postsData;
    }

    const employeesResponse =
      await fetch(API_URL + "?action=employees");

    const employeesData = await employeesResponse.json();

    if (employeesData.ok && Array.isArray(employeesData.data)) {
      employees = employeesData.data;
    } else if (Array.isArray(employeesData)) {
      employees = employeesData;
    }

    setText("apiStatus", "Подключено");

    if (!currentEmployee && employees.length > 0) {
      currentEmployee = employees[0];
    }

    updateEmployee();
  } catch (error) {
    console.error("Ошибка загрузки:", error);
    setText("apiStatus", "Ошибка подключения");
  }
}


/* =========================
   СОТРУДНИК
========================= */

function updateEmployee() {
  if (!currentEmployee) return;

  const name =
    currentEmployee.name ||
    currentEmployee.employeeName ||
    currentEmployee["ФИО"] ||
    "Сотрудник";

  setText("employeeName", name);

  const avatar = $("avatar");

  if (avatar) {
    const firstLetter = name.trim().charAt(0).toUpperCase();
    avatar.textContent = firstLetter || "О";
  }
}


/* =========================
   СКАНЕР QR
========================= */

async function startScanner() {
  const reader = $("reader");

  if (!reader) {
    alert("Элемент сканера не найден.");
    return;
  }

  show("reader");

  try {
    if (scanner) {
      try {
        await scanner.stop();
      } catch (e) {}
    }

    scanner = new Html5Qrcode("reader");

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      },
      (decodedText) => {
        handleQrCode(decodedText);
      },
      () => {}
    );
  } catch (error) {
    console.error("Ошибка камеры:", error);

    const scanError = $("scanError");

    if (scanError) {
      scanError.textContent =
        "Не удалось открыть камеру. Разрешите доступ к камере.";
    } else {
      alert(
        "Не удалось открыть камеру. Разрешите доступ к камере."
      );
    }
  }
}


async function handleQrCode(text) {
  let postId = null;

  const match = String(text).match(/P-\d{3}/i);

  if (match) {
    postId = match[0].toUpperCase();
  }

  if (!postId) {
    try {
      const url = new URL(text);

      postId =
        url.searchParams.get("post") ||
        url.searchParams.get("postId");
    } catch (e) {}
  }

  if (!postId) {
    alert("QR-код не содержит номера поста.");
    return;
  }

  if (scanner) {
    try {
      await scanner.stop();
    } catch (e) {}
  }

  hide("reader");

  openPost(postId);
}


/* =========================
   ПОСТ
========================= */

function findPost(id) {
  return posts.find(
    p =>
      String(p.id || p.postId || p["ID"]) === String(id)
  );
}


function openPost(id) {
  currentPost = findPost(id);

  if (!currentPost) {
    currentPost = {
      id: id,
      name: "Пост №" + parseInt(String(id).replace(/\D/g, ""), 10)
    };
  }

  const postName =
    currentPost.name ||
    currentPost.postName ||
    currentPost["Название"] ||
    "Пост";

  setText("postName", postName);
  setText("postId", currentPost.id || id);

  const currentTime = new Date();

  setText(
    "currentTime",
    currentTime.toLocaleString("ru-RU")
  );

  const modal = $("modal");

  if (modal) {
    modal.classList.remove("hidden");
  }

  updateShiftButton();
}


function closePost() {
  hide("modal");
}


/* =========================
   НАЧАЛО СМЕНЫ
========================= */

async function startShift() {
  if (!currentPost) {
    alert("Сначала выберите пост.");
    return;
  }

  if (!currentEmployee) {
    alert("Сотрудник не выбран.");
    return;
  }

  const postId =
    currentPost.id ||
    currentPost.postId;

  const employeeId =
    currentEmployee.id ||
    currentEmployee.employeeId ||
    currentEmployee["ID"];

  try {
    const result = await sendPost({
      action: "start_shift",

      employee:
        currentEmployee.name ||
        currentEmployee.employeeName ||
        currentEmployee["ФИО"],

      employeeId: employeeId,

      post:
        currentPost.name ||
        currentPost.postName ||
        currentPost["Название"],

      postId: postId
    });

    if (!result.ok) {
      throw new Error(
        result.error || "Не удалось начать смену"
      );
    }

    shiftStarted = true;
    lastCheckTime = new Date();
    nextCheckTime = new Date(
      Date.now() + 2 * 60 * 60 * 1000
    );

    saveState();

    updateShiftButton();
    updateMainScreen();

    alert(
      "Смена начата.\n\nСледующая проверка через 2 часа."
    );
  } catch (error) {
    console.error(error);

    alert(
      "Не удалось начать смену.\n\n" +
      error.message
    );
  }
}


function updateShiftButton() {
  const button = $("shiftBtn");

  if (!button) return;

  if (shiftStarted) {
    button.textContent = "Смена уже начата";
    button.disabled = true;
  } else {
    button.textContent = "Заступить на пост";
    button.disabled = false;
  }
}


/* =========================
   ПРОВЕРКА КАЖДЫЕ 2 ЧАСА
========================= */

async function saveCheck() {
  if (!currentPost) {
    alert("Пост не выбран.");
    return;
  }

  if (!currentEmployee) {
    alert("Сотрудник не выбран.");
    return;
  }

  const incidentRadio =
    document.querySelector(
      'input[name="incidentYes"]:checked'
    );

  const hasIncident =
    incidentRadio &&
    (
      incidentRadio.value === "yes" ||
      incidentRadio.value === "Да" ||
      incidentRadio.value === "true"
    );

  const descriptionEl = $("checkDescription");
  const categoryEl = $("incidentCategory");

  const description = descriptionEl
    ? descriptionEl.value.trim()
    : "";

  const category = categoryEl
    ? categoryEl.value
    : "";

  if (hasIncident && !description) {
    alert(
      "Если произошло происшествие, необходимо описать, что произошло."
    );
    return;
  }

  try {
    const result = await sendPost({
      action: "check",

      employee:
        currentEmployee.name ||
        currentEmployee.employeeName ||
        currentEmployee["ФИО"],

      employeeId:
        currentEmployee.id ||
        currentEmployee.employeeId ||
        currentEmployee["ID"],

      post:
        currentPost.name ||
        currentPost.postName ||
        currentPost["Название"],

      postId:
        currentPost.id ||
        currentPost.postId,

      onPost: true,

      hasIncident: Boolean(hasIncident),

      category: category,

      description: description
    });

    if (!result.ok) {
      throw new Error(
        result.error || "Ошибка сохранения"
      );
    }

    lastCheckTime = new Date();

    nextCheckTime = new Date(
      Date.now() + 2 * 60 * 60 * 1000
    );

    saveState();

    updateMainScreen();

    alert(
      hasIncident
        ? "Отметка сохранена. Происшествие зарегистрировано."
        : "Отметка сохранена.\n\nВы на посту. Происшествий не было."
    );

    clearCheckForm();
    closePost();
  } catch (error) {
    console.error(error);

    alert(
      "Не удалось сохранить отметку.\n\n" +
      error.message
    );
  }
}


function clearCheckForm() {
  const description = $("checkDescription");

  if (description) {
    description.value = "";
  }

  const category = $("incidentCategory");

  if (category) {
    category.selectedIndex = 0;
  }

  const noIncident = document.querySelector(
    'input[name="incidentYes"][value="no"]'
  );

  if (noIncident) {
    noIncident.checked = true;
  }
}


/* =========================
   БЫСТРОЕ ПРОИСШЕСТВИЕ
========================= */

function openIncident() {
  const modal = $("incidentModal");

  if (modal) {
    modal.classList.remove("hidden");
  }
}


function closeIncident() {
  hide("incidentModal");
}


async function saveIncident() {
  if (!currentEmployee) {
    alert("Сотрудник не выбран.");
    return;
  }

  const categoryEl = $("incidentCategory2");
  const descriptionEl = $("incidentDescription");

  const category = categoryEl
    ? categoryEl.value
    : "";

  const description = descriptionEl
    ? descriptionEl.value.trim()
    : "";

  if (!description) {
    alert("Опишите, что произошло.");
    return;
  }

  try {
    const result = await sendPost({
      action: "incident",

      employee:
        currentEmployee.name ||
        currentEmployee.employeeName ||
        currentEmployee["ФИО"],

      employeeId:
        currentEmployee.id ||
        currentEmployee.employeeId ||
        currentEmployee["ID"],

      post: currentPost
        ? (
            currentPost.name ||
            currentPost.postName ||
            currentPost["Название"]
          )
        : "",

      postId: currentPost
        ? (
            currentPost.id ||
            currentPost.postId
          )
        : "",

      category: category,

      description: description
    });

    if (!result.ok) {
      throw new Error(
        result.error || "Ошибка сохранения"
      );
    }

    alert("Происшествие зарегистрировано.");

    if (categoryEl) {
      categoryEl.selectedIndex = 0;
    }

    if (descriptionEl) {
      descriptionEl.value = "";
    }

    closeIncident();
  } catch (error) {
    console.error(error);

    alert(
      "Не удалось зарегистрировать происшествие.\n\n" +
      error.message
    );
  }
}


/* =========================
   ОТПРАВКА В GOOGLE SHEETS
========================= */

async function sendPost(data) {
  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify(data)
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Ответ сервера:", text);

    throw new Error(
      "Сервер вернул некорректный ответ."
    );
  }
}


/* =========================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
========================= */

function saveState() {
  const state = {
    currentPost: currentPost,
    currentEmployee: currentEmployee,
    shiftStarted: shiftStarted,
    lastCheckTime: lastCheckTime
      ? lastCheckTime.toISOString()
      : null,
    nextCheckTime: nextCheckTime
      ? nextCheckTime.toISOString()
      : null
  };

  localStorage.setItem(
    "guardAppState",
    JSON.stringify(state)
  );
}


function restoreState() {
  try {
    const saved =
      localStorage.getItem("guardAppState");

    if (!saved) return;

    const state = JSON.parse(saved);

    currentPost = state.currentPost || null;
    currentEmployee = state.currentEmployee || null;

    shiftStarted =
      Boolean(state.shiftStarted);

    lastCheckTime =
      state.lastCheckTime
        ? new Date(state.lastCheckTime)
        : null;

    nextCheckTime =
      state.nextCheckTime
        ? new Date(state.nextCheckTime)
        : null;

    updateEmployee();
    updateMainScreen();
  } catch (error) {
    console.error(
      "Ошибка восстановления состояния:",
      error
    );
  }
}


/* =========================
   ГЛАВНЫЙ ЭКРАН
========================= */

function updateMainScreen() {
  if (currentPost) {
    const name =
      currentPost.name ||
      currentPost.postName ||
      currentPost["Название"] ||
      "Пост";

    setText("currentPost", name);
  }

  if (nextCheckTime) {
    setText(
      "mainNextCheck",
      formatDateTime(nextCheckTime)
    );
  } else {
    setText(
      "mainNextCheck",
      "После заступления на пост"
    );
  }

  updateEmployee();
}


/* =========================
   ВРЕМЯ
========================= */

function updateTime() {
  const now = new Date();

  const text =
    now.toLocaleDateString("ru-RU") +
    " " +
    now.toLocaleTimeString("ru-RU");

  setText("currentTime", text);
}


function formatDateTime(date) {
  if (!date) return "—";

  return date.toLocaleString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}
