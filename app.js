const API_URL =
"https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";


let posts = [];
let employees = [];

let currentPost = null;
let currentEmployee = null;

let shiftStarted = false;
let nextCheckTime = null;



// ===============================
// ЗАПУСК
// ===============================

document.addEventListener(
"DOMContentLoaded",
async function(){

  connectButtons();

  restoreState();

  updateTime();

  setInterval(updateTime,1000);

  await loadData();

  updatePage();

});



// ===============================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===============================

function $(id){
  return document.getElementById(id);
}


function setText(id,value){

  let el=$(id);

  if(el){
    el.textContent=value;
  }

}


function show(id){

  let el=$(id);

  if(el){
    el.classList.remove("hidden");
  }

}


function hide(id){

  let el=$(id);

  if(el){
    el.classList.add("hidden");
  }

}



// ===============================
// КНОПКИ
// ===============================

function connectButtons(){


let scanBtn=$("scanBtn");

if(scanBtn){

scanBtn.onclick=startScanner;

}



let demoBtn=$("demoBtn");

if(demoBtn){

demoBtn.onclick=function(){

openPost("P-001");

};

}



let shiftBtn=$("shiftBtn");

if(shiftBtn){

shiftBtn.onclick=startShift;

}



let saveBtn=$("saveBtn");

if(saveBtn){

saveBtn.onclick=saveCheck;

}



let closeBtn=$("closeBtn");

if(closeBtn){

closeBtn.onclick=closeModal;

}



let incidentBtn=$("incidentBtn");

if(incidentBtn){

incidentBtn.onclick=openIncident;

}



let incidentSave=$("incidentSaveBtn");

if(incidentSave){

incidentSave.onclick=saveIncident;

}



let incidentClose=$("incidentCloseBtn");

if(incidentClose){

incidentClose.onclick=closeIncident;

}


}




// ===============================
// ЗАГРУЗКА ДАННЫХ
// ===============================

async function loadData(){


try{


let postsResponse =
await fetch(
API_URL+"?action=posts"
);


let postsJson =
await postsResponse.json();



if(Array.isArray(postsJson)){

posts=postsJson;

}

else if(postsJson.posts){

posts=postsJson.posts;

}

else if(postsJson.data){

posts=postsJson.data;

}




let empResponse =
await fetch(
API_URL+"?action=employees"
);



let empJson =
await empResponse.json();



if(Array.isArray(empJson)){

employees=empJson;

}

else if(empJson.employees){

employees=empJson.employees;

}

else if(empJson.data){

employees=empJson.data;

}




if(employees.length>0){

currentEmployee =
normalizeEmployee(
employees[0]
);

}


updateEmployee();


setText(
"apiStatus",
"Подключено"
);


}
catch(error){


console.error(
error
);


setText(
"apiStatus",
"Ошибка подключения"
);


}


}




// ===============================
// СОТРУДНИК
// ===============================

function normalizeEmployee(e){


return {


id:
e.id ||
e.ID ||
e.employeeId ||
"",


name:
e.name ||
e.employeeName ||
e["ФИО"] ||
e["Имя"] ||
"Охранник"


};


}



function updateEmployee(){


if(!currentEmployee){

return;

}


setText(
"employeeName",
currentEmployee.name
);



let avatar=$("avatar");


if(avatar){

avatar.textContent =
currentEmployee.name
.substring(0,1)
.toUpperCase();

}


}



// ===============================
// ПОСТЫ
// ===============================


function normalizePost(p){


return {


id:
p.id ||
p.ID ||
p.postId ||
"",


name:
p.name ||
p.postName ||
p["Название"] ||
"Пост"


};


}



function findPost(id){


for(let p of posts){


let post =
normalizePost(p);


if(
String(post.id)
===
String(id)
){

return post;

}


}


return null;

}



function openPost(id){


currentPost =
findPost(id);



if(!currentPost){


currentPost={

id:id,

name:"Пост №"+
id.replace("P-","")

};


}



setText(
"postName",
currentPost.name
);


setText(
"postId",
currentPost.id
);


setText(
"currentTime",
new Date()
.toLocaleString("ru-RU")
);



show("modal");


updateShiftButton();


}
// ===============================
// QR СКАНЕР
// ===============================


let scanner = null;


async function startScanner(){


let reader=$("reader");


if(!reader){

alert(
"Сканер не найден"
);

return;

}


show("reader");



try{


scanner =
new Html5Qrcode(
"reader"
);



await scanner.start(

{
facingMode:"environment"
},


{
fps:10,

qrbox:{
width:250,
height:250
}

},


function(decodedText){


let id=null;



let match =
decodedText.match(
/P-\d{3}/i
);



if(match){

id=
match[0]
.toUpperCase();

}



if(id){


scanner.stop()
.catch(()=>{});



hide("reader");


openPost(id);


}


}


);


}
catch(error){


console.error(error);


alert(
"Не удалось открыть камеру"
);


}


}




// ===============================
// ЗАСТУПЛЕНИЕ НА ПОСТ
// ===============================


async function startShift(){



if(!currentPost){

alert(
"Пост не выбран"
);

return;

}



if(!currentEmployee){

alert(
"Сотрудник не выбран"
);

return;

}




try{


let result =
await sendAPI({

action:
"start_shift",


employee:
currentEmployee.name,


employeeId:
currentEmployee.id,


post:
currentPost.name,


postId:
currentPost.id


});



if(result.success===false){

throw new Error(
result.message ||
"Ошибка сервера"
);

}



shiftStarted=true;



nextCheckTime =
new Date(
Date.now()
+
2*60*60*1000
);



saveState();



updateShiftButton();


updatePage();



alert(

"Вы заступили на пост\n\n"+
currentPost.name+
"\n\nСледующая отметка через 2 часа"

);



}
catch(error){


console.error(error);


alert(
"Ошибка заступления:\n"+
error.message
);


}


}





function updateShiftButton(){


let btn=$("shiftBtn");


if(!btn){

return;

}



if(shiftStarted){


btn.textContent =
"Пост принят";


btn.disabled=true;


}

else{


btn.textContent =
"Заступить на пост";


btn.disabled=false;


}



}





// ===============================
// ДВУХЧАСОВАЯ ПРОВЕРКА
// ===============================


async function saveCheck(){



if(!currentPost){

alert(
"Выберите пост"
);

return;

}



if(!currentEmployee){

alert(
"Сотрудник не выбран"
);

return;

}



let incident =
document.querySelector(
'input[name="incidentYes"]:checked'
);



let hasIncident =
incident &&
incident.value==="yes";



let description =
$("checkDescription")
?
$("checkDescription").value.trim()
:
"";



let category =
$("incidentCategory")
?
$("incidentCategory").value
:
"";



if(
hasIncident &&
description===""

){

alert(
"Опишите происшествие"
);

return;

}



try{


let result =
await sendAPI({

action:
"check",


employee:
currentEmployee.name,


employeeId:
currentEmployee.id,


post:
currentPost.name,


postId:
currentPost.id,


onPost:true,


hasIncident:
Boolean(hasIncident),


category:
category,


description:
description


});



if(result.success===false){

throw new Error(
result.message
);

}



nextCheckTime =
new Date(
Date.now()
+
2*60*60*1000
);



saveState();


updatePage();



clearForm();



alert(
"Отметка сохранена"
);



closeModal();



}
catch(error){


console.error(error);


alert(
"Ошибка сохранения:\n"+
error.message
);


}


}





function clearForm(){


let d=$("checkDescription");


if(d){

d.value="";

}


}




// ===============================
// ПРОИСШЕСТВИЕ
// ===============================


function openIncident(){


show(
"incidentModal"
);


}



function closeIncident(){


hide(
"incidentModal"
);


}





async function saveIncident(){



if(!currentEmployee){

alert(
"Сотрудник не выбран"
);

return;

}



let description =
$("incidentDescription")
?
$("incidentDescription").value.trim()
:
"";



let category =
$("incidentCategory2")
?
$("incidentCategory2").value
:
"";



if(description===""){


alert(
"Введите описание"
);


return;


}



try{


let result =
await sendAPI({

action:
"incident",


employee:
currentEmployee.name,


employeeId:
currentEmployee.id,


post:
currentPost
?
currentPost.name
:
"",


postId:
currentPost
?
currentPost.id
:
"",


category:
category,


description:
description


});



if(result.success===false){

throw new Error(
result.message
);

}



alert(
"Происшествие отправлено"
);



$("incidentDescription").value="";



closeIncident();



}
catch(error){


alert(
"Ошибка отправки:\n"+
error.message
);


}


}
// ===============================
// ОТПРАВКА В GOOGLE APPS SCRIPT
// ===============================


async function sendAPI(data){


let response =
await fetch(

API_URL,

{

method:"POST",

headers:{

"Content-Type":
"text/plain;charset=utf-8"

},

body:
JSON.stringify(data)

}

);



let text =
await response.text();



try{

return JSON.parse(text);

}

catch(e){


console.error(
"Ответ сервера:",
text
);


return {

success:false,

message:
"Неверный ответ сервера"

};


}



}




// ===============================
// СОХРАНЕНИЕ СОСТОЯНИЯ
// ===============================


function saveState(){


localStorage.setItem(

"guard_state",

JSON.stringify({

employee:
currentEmployee,


post:
currentPost,


shift:
shiftStarted,


next:
nextCheckTime
?
nextCheckTime.toISOString()
:
null


})

);


}





function restoreState(){


try{


let data =
JSON.parse(

localStorage.getItem(
"guard_state"
)

);



if(!data){

return;

}



currentEmployee =
data.employee ||
null;



currentPost =
data.post ||
null;



shiftStarted =
data.shift ||
false;



if(data.next){

nextCheckTime =
new Date(
data.next
);

}



}
catch(error){

console.error(error);

}


}





// ===============================
// ОБНОВЛЕНИЕ СТРАНИЦЫ
// ===============================


function updatePage(){


updateEmployee();



if(currentPost){


setText(

"currentPost",

currentPost.name

);


}

else{


setText(

"currentPost",

"Пост не выбран"

);


}




if(nextCheckTime){


setText(

"mainNextCheck",

"Следующая проверка: "+
nextCheckTime.toLocaleString(
"ru-RU"
)

);


}

else{


setText(

"mainNextCheck",

"После заступления на пост"

);


}



updateShiftButton();


}




// ===============================
// ЗАКРЫТИЕ ОКОН
// ===============================


function closeModal(){


hide(
"modal"
);


}



function closeIncident(){


hide(
"incidentModal"
);


}





// ===============================
// ВРЕМЯ
// ===============================


function updateTime(){


setText(

"currentTime",

new Date()
.toLocaleString(
"ru-RU"
)

);


}
