const API_URL =
"https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";


let posts = [];

let currentPost = null;

if(!currentEmployee){

  show("employeeModal");

};

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

updateTime();

setInterval(
updateTime,
1000
);


loadPosts();


setTimeout(
checkEmployee,
300
);


updatePage();


});




// ===============================
// ОСНОВНЫЕ ФУНКЦИИ
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


let demo =
$("demoBtn");


if(demo){

demo.onclick=function(){

openPost("P-001");

};

}




let scan =
$("scanBtn");


if(scan){

scan.onclick=startScanner;

}




let shift =
$("shiftBtn");


if(shift){

shift.addEventListener(
"click",
function(){

console.log("Кнопка заступления нажата");

startShift();

}

);

}




let save =
$("saveBtn");


if(save){

save.onclick=saveCheck;

}




let close =
$("closeBtn");


if(close){

close.onclick=closeModal;

}




let incident =
$("incidentBtn");


if(incident){

incident.onclick=openIncident;

}




let incidentSave =
$("incidentSaveBtn");


if(incidentSave){

incidentSave.onclick=saveIncident;

}




let incidentClose =
$("incidentCloseBtn");


if(incidentClose){

incidentClose.onclick=closeIncident;

}




let employeeSave =
$("employeeSaveBtn");


if(employeeSave){

employeeSave.onclick=saveEmployee;

}



}



// ===============================
// СОТРУДНИК
// ===============================


function checkEmployee(){


/*
 ВСЕГДА просим ФИО
 без автоподстановки
*/


currentEmployee=null;


show(
"employeeModal"
);



}




function saveEmployee(){


let input =
$("employeeInput");



if(!input){

return;

}



let fio =
input.value.trim();



if(fio===""){


alert(
"Введите ФИО"
);


return;


}



currentEmployee={


id:"",


name:fio


};



localStorage.setItem(

"currentEmployee",

JSON.stringify(
currentEmployee
)

);



setText(

"employeeName",

fio

);



let avatar =
$("avatar");



if(avatar){

avatar.textContent =
fio
.substring(0,1)
.toUpperCase();

}



hide(
"employeeModal"
);



saveState();



}




function updateEmployee(){


if(!currentEmployee){

return;

}



setText(

"employeeName",

currentEmployee.name

);



let avatar =
$("avatar");


if(avatar){

avatar.textContent =
currentEmployee.name
.substring(0,1)
.toUpperCase();

}



}



// ===============================
// ЗАГРУЗКА ПОСТОВ
// ===============================


async function loadPosts(){


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

else if(data.data){

posts=data.data;

}



setText(
"apiStatus",
"Подключено"
);



}
catch(error){


console.log(error);


setText(
"apiStatus",
"Ошибка подключения"
);


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


for(let item of posts){


let post =
normalizePost(item);



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



show(
"modal"
);



updateShiftButton();


}




// ===============================
// QR СКАНЕР
// ===============================


async function startScanner(){


let reader =
$("reader");



if(!reader){

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



function(result){



let match =
result.match(
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


console.log(error);


alert(
"Ошибка камеры"
);


}



}




// ===============================
// ЗАСТУПЛЕНИЕ
// ===============================


async function startShift(){



if(!currentEmployee){


alert(
"Введите ФИО сотрудника"
);


return;


}



if(!currentPost){


alert(
"Выберите пост"
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
result.message
);


}




shiftStarted=true;



nextCheckTime =
new Date(

Date.now()
+
7200000

);



saveState();



updateShiftButton();



alert(

"Вы заступили на пост\n\n"+
currentPost.name

);



}
catch(error){


alert(

"Ошибка:\n"+
error.message

);


}



}




function updateShiftButton(){


let btn =
$("shiftBtn");



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
// ПРОВЕРКА
// ===============================


async function saveCheck(){



if(!currentEmployee ||
!currentPost){


alert(
"Нет сотрудника или поста"
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



let result =
await sendAPI({


action:
"check",


employee:
currentEmployee.name,


post:
currentPost.name,


postId:
currentPost.id,


hasIncident:
Boolean(hasIncident),


category:
category,


description:
description



});



if(result.success!==false){


nextCheckTime =
new Date(

Date.now()
+
7200000

);



saveState();



alert(
"Проверка сохранена"
);



closeModal();


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
// ===============================
// СОХРАНЕНИЕ ПРОИСШЕСТВИЯ
// ===============================


async function saveIncident(){



if(!currentEmployee){


alert(
"Введите ФИО"
);


return;


}



let description =
$("incidentDescription")
?
$("incidentDescription").value.trim()
:
"";



if(description===""){


alert(
"Введите описание"
);


return;


}



let result =
await sendAPI({


action:
"incident",


employee:
currentEmployee.name,


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
$("incidentCategory2")
?
$("incidentCategory2").value
:
"",


description:
description


});



if(result.success!==false){


alert(
"Происшествие отправлено"
);



$("incidentDescription").value="";


closeIncident();


}



}





// ===============================
// ОТПРАВКА В GOOGLE SCRIPT
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


return {


success:false,


message:text


};


}



}





// ===============================
// СОСТОЯНИЕ
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


let state =
JSON.parse(

localStorage.getItem(
"guard_state"
)

);



if(!state){

return;

}



currentPost =
state.post ||
null;



shiftStarted =
state.shift ||
false;



if(state.next){


nextCheckTime =
new Date(
state.next
);


}



}
catch(error){


console.log(error);


}



}




// ===============================
// ЭКРАН
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



updateShiftButton();



}




// ===============================
// ЗАКРЫТИЕ
// ===============================


function closeModal(){


hide(
"modal"
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
