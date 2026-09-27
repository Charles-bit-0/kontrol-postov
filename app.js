// ВСТАВЬТЕ СЮДА URL опубликованного Google Apps Script /exec
const API_URL = "https://script.google.com/macros/s/AKfycbx3596VxqLcMoU-rIbMTeBQtyhc4pix2FfbhqK1nobPhVJV03IdnMl0oCZRiNBJ6RJt/exec";

const modal=document.getElementById("modal");
const postName=document.getElementById("postName");
const postId=document.getElementById("postId");
const currentTime=document.getElementById("currentTime");
let scanner=null;

const POSTS={
 "P-001":"КПП №1","P-002":"КПП №2","P-003":"МФОЦ","P-004":"Автопарк","P-005":"Музей"
};

function openPost(id,name){
 postId.textContent=id; postName.textContent=name; updateTime();
 modal.classList.remove("hidden");
}
function updateTime(){currentTime.textContent="Время: "+new Date().toLocaleString("ru-RU");}

document.getElementById("demoBtn").onclick=()=>openPost("P-001","КПП №1");

document.getElementById("scanBtn").onclick=async()=>{
 const reader=document.getElementById("reader");
 const err=document.getElementById("scanError");
 err.textContent="";
 reader.classList.remove("hidden");
 if(!window.Html5Qrcode){
   err.textContent="Модуль сканирования не загрузился.";
   return;
 }
 scanner=new Html5Qrcode("reader");
 try{
   await scanner.start(
     {facingMode:"environment"},
     {fps:10,qrbox:{width:240,height:240}},
     async(decodedText)=>{
       const match=decodedText.match(/[?&]post=([^&#]+)/i) || decodedText.match(/^(P-\d+)$/i);
       const id=match ? decodeURIComponent(match[1]).toUpperCase() : "";
       if(POSTS[id]){
         await scanner.stop().catch(()=>{});
         scanner=null; reader.classList.add("hidden");
         openPost(id,POSTS[id]);
       } else {
         err.textContent="QR-код не относится к системе контроля постов.";
       }
     },
     ()=>{}
   );
 }catch(e){
   err.textContent="Не удалось открыть камеру. Разрешите доступ к камере.";
 }
};

document.getElementById("closeBtn").onclick=async()=>{
 if(scanner){await scanner.stop().catch(()=>{});scanner=null;}
 document.getElementById("reader").classList.add("hidden");
 modal.classList.add("hidden");
};

document.getElementById("saveBtn").onclick = async () => {
  const result = document.getElementById("result").value;
  const comment = document.getElementById("comment").value.trim();
  const employee = "Иванов И.И.";

  if (!API_URL || API_URL.includes("ВСТАВЬТЕ_URL")) {
    alert("Сначала укажите API_URL в app.js.");
    return;
  }

  const button = document.getElementById("saveBtn");
  button.disabled = true;
  button.textContent = "Сохранение...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({
        postId: postId.textContent,
        employee: employee,
        result: result,
        comment: comment,
        device: navigator.userAgent
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Ошибка сервера");
    }

    alert(
      "✓ Проверка зарегистрирована\n\n" +
      data.post + "\n" +
      data.time
    );

    modal.classList.add("hidden");
    document.getElementById("comment").value = "";

  } catch (error) {
    alert("Не удалось сохранить проверку:\n" + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Зарегистрировать проверку";
  }
};

document.getElementById("incidentBtn").onclick=()=>alert("Следующим этапом добавим форму происшествия с фото.");
setInterval(updateTime,1000);
