const API_URL =
"https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";


// ===============================
// ГЛОБАЛЬНЫЕ ДАННЫЕ
// ===============================

let posts = [];

let currentPost = null;

let currentEmployee = null;

let shiftStarted = false;

let nextCheckTime = null;

let scanner = null;



// ===============================
// ЗАПУСК
// ===============================

document.addEventListener(
"DOMContentLoaded",
function(){


connectButtons();


restoreState();


updatePage();


loadData();


}
);



// ===============================
// ВСПОМОГАТЕЛЬНЫЕ
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


let scanBtn = $("scanBtn");

if(scanBtn){

scanBtn.onclick = startScanner;

}



let demoBtn = $("demoBtn");

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



let incidentSaveBtn=$("incidentSaveBtn");

if(incidentSaveBtn){

incidentSaveBtn.onclick=saveIncident;

}



let incidentCloseBtn=$("incidentCloseBtn");

if(incidentCloseBtn){

incidentCloseBtn.onclick=closeIncident;

}



// КНОПКА СОХРАНЕНИЯ ФИО

let employeeSaveBtn=$("employeeSaveBtn");


if(employeeSaveBtn){


employeeSaveBtn.onclick=function(){


let input=$("employeeInput");


if(!input){

return;

}



let fio=input.value.trim();



if(fio===""){


alert(
"Введите ФИО сотрудника"
);


return;


}



// создаём сотрудника

currentEmployee={

id:"",

name:fio

};



localStorage.setItem(

"employee",

JSON.stringify(currentEmployee)

);



setText(

"employeeName",

fio

);



let avatar=$("avatar");


if(avatar){

avatar.textContent=
fio.substring(0,1)
.toUpperCase();

}



hide("employeeModal");



saveState();



};


}


}



// ===============================
// ЗАГРУЗКА ДАННЫХ
// ===============================

async function loadData(){


try{


let response =
await fetch(
API_URL+"?action=posts"
);



let data =
await response.json();



if(Array.isArray(data)){

posts=data;

}

else if(data.posts){

posts=data.posts;

}



setText(
"apiStatus",
"Подключено"
);



let saved =
localStorage.getItem(
"employee"
);



if(saved){


currentEmployee =
JSON.parse(saved);


}



updatePage();



}
catch(error){


console.error(error);


setText(
"apiStatus",
"Ошибка подключения"
);


}


}



// ===============================
// СОТРУДНИК
// ===============================

function updateEmployee(){


if(!currentEmployee){

setText(
"employeeName",
"Не выбран"
);

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
p["ID поста"] ||
"",


name:
p.name ||
p.postName ||
p["Пост"] ||
p["Название"] ||
"Пост"

};

}



function findPost(id){


for(let i=0;i<posts.length;i++){


let post =
normalizePost(posts[i]);


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

name:
"Пост №"+
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
// ЗАСТУПЛЕНИЕ НА ПОСТ
// ===============================


async function startShift(){



console.log(
"Кнопка заступления нажата"
);



if(!currentPost){


alert(
"Сначала выберите пост"
);


return;


}



if(!currentEmployee){


alert(
"Введите ФИО сотрудника"
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



console.log(
"Ответ сервера:",
result
);



if(result.success===false){


throw new Error(
result.message
);


}



shiftStarted=true;



saveState();



updateShiftButton();



alert(

"Вы заступили на пост\n\n"+
currentPost.name

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


btn.textContent=
"Пост принят";


btn.disabled=true;



}

else{


btn.textContent=
"Заступить на пост";


btn.disabled=false;


}


}
// ===============================
// ПРОВЕРКА ПОСТА
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
"Введите ФИО сотрудника"
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



console.log(
"Проверка:",
result
);



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



alert(
"Проверка сохранена"
);



closeModal();



}



catch(error){


console.error(error);



alert(

"Ошибка проверки:\n"+
error.message

);


}


}




// ===============================
// ОТПРАВКА ПРОИСШЕСТВИЯ
// ===============================


async function saveIncident(){



if(!currentEmployee){


alert(
"Введите ФИО сотрудника"
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



console.log(
"Происшествие:",
result
);



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


console.error(error);


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


method:
"POST",


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

catch(error){


console.error(
"Ответ сервера:",
text
);



return {

success:false,

message:
"Ошибка ответа сервера"

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



currentPost =
data.post ||
null;



shiftStarted =
data.shift ||
false;



if(data.employee){


currentEmployee =
data.employee;


}



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
// ОБНОВЛЕНИЕ ЭКРАНА
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


updateShiftButton();


}
// ===============================
// QR СКАНЕР
// ===============================


async function startScanner(){


let reader =
$("reader");



if(!reader){

alert(
"Сканер не найден"
);

return;

}



show(
"reader"
);



try{


scanner =
new Html5Qrcode(
"reader"
);



await scanner.start(


{
facingMode:
"environment"
},



{
fps:10,


qrbox:{
width:250,
height:250
}


},



function(decodedText){



let match =
decodedText.match(
/P-\d{3}/i
);



if(match){


let id =
match[0]
.toUpperCase();



scanner.stop()
.catch(()=>{});



hide(
"reader"
);



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
// ЗАКРЫТИЕ ОКОН
// ===============================


function closeModal(){


hide(
"modal"
);


}



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
