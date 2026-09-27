const API_URL = "https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";

let scanner = null;
let posts = [];
let employees = [];

let currentPost = null;
let currentEmployee = null;

let shiftStarted = false;
let lastCheckTime = null;
let nextCheckTime = null;

const modal = document.getElementById("modal");
const reader = document.getElementById("reader");
const scanError = document.getElementById("scanError");

const postName = document.getElementById("postName");
const postId = document.getElementById("postId");
const currentTime = document.getElementById("currentTime");


// =====================================================
// ЗАПУСК
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

  updateTime();
  setInterval(updateTime, 1000);

  await loadData();

  document.getElementById("scanBtn").onclick = startScanner;
  document.getElementById("demoBtn").onclick = () => openPost("P-001");

  document.getElementById("closeBtn").onclick = closeModal;

  document.getElementById("saveBtn").onclick = saveCheck;

  document.getElementById("incidentBtn").onclick = openIncident;

  document.getElementById("incidentSaveBtn").onclick = saveIncident;

  document.getElementById("incidentCloseBtn").onclick = closeIncident;

  document.getElementById("shiftBtn").onclick = startShift;

  restoreState();
});


// =====================================================
// ЗАГРУЗКА ДАННЫХ ИЗ GOOGLE
// =====================================================

async function loadData() {

  try {

    const postsResponse =
      await fetch(API_URL + "?action=posts");

    const postsData =
      await postsResponse.json();

    if (postsData.success) {
      posts = postsData.posts || [];
    }


    const employeesResponse =
      await fetch(API_URL + "?action=employees");

    const employeesData =
      await employeesResponse.json();

    if (employeesData.success) {
      employees = employeesData.employees || [];
    }


    if (employees.length > 0) {

      currentEmployee = employees[0];

      document.getElementById("employeeName").textContent =
        currentEmployee.name;

      document.getElementById("avatar").textContent =
        getInitials(currentEmployee.name);
    }

  } catch (error) {

    console.error("Ошибка загрузки данных:", error);

    document.getElementById("apiStatus").textContent =
      "Нет связи с сервером";

    document.getElementById("apiStatus").className =
      "offline";
  }
}


// =====================================================
// НАЧАЛО СМЕНЫ
// =====================================================

async function startShift() {

  if (!currentPost) {
    alert("Сначала выберите пост.");
    return;
  }

  if (!currentEmployee) {
    alert("Сотрудник не определён.");
    return;
  }


  const button =
    document.getElementById("shiftBtn");

  button.disabled = true;
  button.textContent = "Регистрация...";


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          action: "start_shift",

          employee:
            currentEmployee.name,

          employeeId:
            currentEmployee.id,

          post:
            currentPost.name,

          postId:
            currentPost.id

        })

      });


    const data =
      await response.json();


    if (!data.success) {
      throw new Error(data.message || "Ошибка сервера");
    }


    shiftStarted = true;

    lastCheckTime =
      new Date();


    nextCheckTime =
      new Date(
        lastCheckTime.getTime() +
        2 * 60 * 60 * 1000
      );


    saveState();


    updateMainScreen();

    closeModal();


    alert(
      "✓ Вы заступили на пост\n\n" +
      currentPost.name +
      "\n\n" +
      "Следующая отметка через 2 часа."
    );


  } catch (error) {

    alert(
      "Не удалось зарегистрировать заступление:\n" +
      error.message
    );

  } finally {

    button.disabled = false;
    button.textContent = "Заступить на пост";

  }
}


// =====================================================
// QR СКАНЕР
// =====================================================

async function startScanner() {

  scanError.textContent = "";

  reader.classList.remove("hidden");


  if (!window.Html5Qrcode) {

    scanError.textContent =
      "Модуль сканирования не загрузился.";

    return;
  }


  scanner =
    new Html5Qrcode("reader");


  try {

    await scanner.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,
        qrbox: {
          width: 240,
          height: 240
        }
      },

      async decodedText => {

        const id =
          parsePostId(decodedText);


        if (!id) {

          scanError.textContent =
            "Неизвестный QR-код.";

          return;
        }


        const post =
          posts.find(p =>
            p.id === id
          );


        if (!post) {

          scanError.textContent =
            "Такого поста нет в системе.";

          return;
        }


        await stopScanner();

        openPost(id);

      },

      () => {}

    );

  } catch (error) {

    scanError.textContent =
      "Не удалось открыть камеру. Разрешите доступ к камере.";

  }
}


function parsePostId(text) {

  const value =
    String(text).trim();


  const match =
    value.match(
      /[?&]post=([^&#]+)/i
    );


  if (match) {

    return decodeURIComponent(
      match[1]
    ).toUpperCase();

  }


  if (
    /^P-\d{3}$/i.test(value)
  ) {

    return value.toUpperCase();

  }


  return null;
}


async function stopScanner() {

  if (scanner) {

    await scanner.stop()
      .catch(() => {});

    scanner = null;
  }

  reader.classList.add("hidden");
}


// =====================================================
// ОТКРЫТИЕ ПОСТА
// =====================================================

function openPost(id) {

  const post =
    posts.find(p =>
      p.id === id
    );


  if (!post) {

    alert("Пост не найден.");

    return;
  }


  currentPost = post;


  postName.textContent =
    post.name;

  postId.textContent =
    post.id;


  updateModal();


  modal.classList.remove("hidden");
}


function updateModal() {

  if (!currentPost) {
    return;
  }


  const shiftInfo =
    document.getElementById("shiftInfo");


  const shiftButton =
    document.getElementById("shiftBtn");


  const checkForm =
    document.getElementById("checkForm");


  if (!shiftStarted) {

    shiftInfo.textContent =
      "Вы ещё не заступили на этот пост.";

    shiftButton.classList.remove("hidden");

    checkForm.classList.add("hidden");

    return;
  }


  shiftButton.classList.add("hidden");

  checkForm.classList.remove("hidden");


  if (nextCheckTime) {

    document.getElementById("nextCheck").textContent =
      "Следующая отметка: " +
      nextCheckTime.toLocaleTimeString(
        "ru-RU"
      );

  }
}


// =====================================================
// ДВУХЧАСОВАЯ ОТМЕТКА
// =====================================================

async function saveCheck() {

  if (!currentPost) {

    alert("Пост не выбран.");

    return;
  }


  if (!currentEmployee) {

    alert("Сотрудник не определён.");

    return;
  }


  const hasIncident =
    document.getElementById(
      "incidentYes"
    ).checked;


  const description =
    document.getElementById(
      "checkDescription"
    ).value.trim();


  if (
    hasIncident &&
    !description
  ) {

    alert(
      "Если произошло происшествие, необходимо его описать."
    );

    return;
  }


  const button =
    document.getElementById(
      "saveBtn"
    );


  button.disabled = true;

  button.textContent =
    "Сохранение...";


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          action: "check",

          employee:
            currentEmployee.name,

          employeeId:
            currentEmployee.id,

          post:
            currentPost.name,

          postId:
            currentPost.id,

          onPost: true,

          hasIncident:
            hasIncident,

          description:
            description,

          category:
            document.getElementById(
              "incidentCategory"
            ).value

        })

      });


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Ошибка сервера"
      );
    }


    lastCheckTime =
      new Date();


    nextCheckTime =
      new Date(
        lastCheckTime.getTime() +
        2 * 60 * 60 * 1000
      );


    shiftStarted = true;

    saveState();


    resetCheckForm();

    updateMainScreen();

    closeModal();


    alert(
      "✓ Отметка принята\n\n" +
      currentPost.name +
      "\n" +
      "Время: " +
      new Date().toLocaleTimeString(
        "ru-RU"
      ) +
      "\n\n" +
      "Следующая отметка через 2 часа."
    );


  } catch (error) {

    alert(
      "Не удалось сохранить отметку:\n" +
      error.message
    );

  } finally {

    button.disabled = false;

    button.textContent =
      "Подтвердить отметку";

  }
}


// =====================================================
// СРОЧНОЕ ПРОИСШЕСТВИЕ
// =====================================================

function openIncident() {

  document
    .getElementById("incidentModal")
    .classList.remove("hidden");
}


async function saveIncident() {

  if (!currentEmployee) {

    alert("Сотрудник не определён.");

    return;
  }


  const post =
    currentPost;


  const description =
    document.getElementById(
      "incidentDescription"
    ).value.trim();


  const category =
    document.getElementById(
      "incidentType"
    ).value;


  if (!description) {

    alert(
      "Опишите, что произошло."
    );

    return;
  }


  const button =
    document.getElementById(
      "incidentSaveBtn"
    );


  button.disabled = true;

  button.textContent =
    "Отправка...";


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          action: "incident",

          employee:
            currentEmployee.name,

          employeeId:
            currentEmployee.id,

          post:
            post ? post.name : "",

          postId:
            post ? post.id : "",

          category:
            category,

          description:
            description

        })

      });


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Ошибка сервера"
      );
    }


    document
      .getElementById(
        "incidentDescription"
      )
      .value = "";


    document
      .getElementById(
        "incidentModal"
      )
      .classList.add("hidden");


    alert(
      "✓ Происшествие зарегистрировано."
    );


  } catch (error) {

    alert(
      "Не удалось отправить происшествие:\n" +
      error.message
    );

  } finally {

    button.disabled = false;

    button.textContent =
      "Отправить происшествие";

  }
}


// =====================================================
// ЗАКРЫТИЕ
// =====================================================

async function closeModal() {

  await stopScanner();

  modal.classList.add("hidden");
}


function closeIncident() {

  document
    .getElementById(
      "incidentModal"
    )
    .classList.add("hidden");
}


// =====================================================
// ВРЕМЯ
// =====================================================

function updateTime() {

  const element =
    document.getElementById(
      "currentTime"
    );

  if (element) {

    element.textContent =
      new Date().toLocaleString(
        "ru-RU"
      );
  }
}


// =====================================================
// СОСТОЯНИЕ
// =====================================================

function saveState() {

  localStorage.setItem(
    "kontrolPostovState",

    JSON.stringify({

      employeeId:
        currentEmployee
          ? currentEmployee.id
          : null,

      postId:
        currentPost
          ? currentPost.id
          : null,

      shiftStarted:
        shiftStarted,

      lastCheckTime:
        lastCheckTime
          ? lastCheckTime.toISOString()
          : null,

      nextCheckTime:
        nextCheckTime
          ? nextCheckTime.toISOString()
          : null

    })
  );
}


function restoreState() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          "kontrolPostovState"
        )
      );


    if (!saved) {
      return;
    }


    if (saved.employeeId) {

      currentEmployee =
        employees.find(
          e =>
            e.id === saved.employeeId
        ) ||
        currentEmployee;
    }


    if (saved.postId) {

      currentPost =
        posts.find(
          p =>
            p.id === saved.postId
        ) ||
        null;
    }


    shiftStarted =
      saved.shiftStarted === true;


    if (saved.lastCheckTime) {

      lastCheckTime =
        new Date(
          saved.lastCheckTime
        );
    }


    if (saved.nextCheckTime) {

      nextCheckTime =
        new Date(
          saved.nextCheckTime
        );
    }


    updateMainScreen();

  } catch (error) {

    console.error(
      "Ошибка восстановления:",
      error
    );
  }
}


// =====================================================
// ГЛАВНЫЙ ЭКРАН
// =====================================================

function updateMainScreen() {

  const currentPostElement =
    document.getElementById(
      "currentPost"
    );


  const nextCheckElement =
    document.getElementById(
      "mainNextCheck"
    );


  if (currentPost) {

    currentPostElement.textContent =
      currentPost.name;

  } else {

    currentPostElement.textContent =
      "Пост не выбран";
  }


  if (
    nextCheckTime &&
    shiftStarted
  ) {

    nextCheckElement.textContent =
      "Следующая отметка: " +
      nextCheckTime.toLocaleTimeString(
        "ru-RU"
      );

  } else {

    nextCheckElement.textContent =
      "Заступите на пост, чтобы начать контроль.";
  }
}


function resetCheckForm() {

  document.getElementById(
    "incidentNo"
  ).checked = true;


  document.getElementById(
    "incidentYes"
  ).checked = false;


  document.getElementById(
    "checkDescription"
  ).value = "";


  document.getElementById(
    "incidentCategory"
  ).value = "Другое";
}


function getInitials(name) {

  return String(name)
    .split(" ")
    .filter(Boolean)
    .map(
      word =>
        word[0]
          ? word[0].toUpperCase()
          : ""
    )
    .slice(0, 2)
    .join("");
}
