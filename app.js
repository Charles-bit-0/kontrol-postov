const API_URL =
"https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";


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
async function(){


connectButtons();


restoreState();


updateTime();

setInterval(
updateTime,
1000
);


await loadData();


checkEmployee();


updatePage();


});




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





let incidentSaveBtn=$("incidentSaveBtn");

if(incidentSaveBtn){

incidentSaveBtn.onclick=saveIncident;

}





let incidentCloseBtn=$("incidentCloseBtn");

if(incidentCloseBtn){

incidentCloseBtn.onclick=closeIncident;

}




// НОВОЕ ОКНО ФИО


let employeeSaveBtn =
$("employeeSaveBtn");



if(employeeSaveBtn){


employeeSaveBtn.onclick =
saveEmployee;


}



}




// ===============================
// ПРОВЕРКА СОТРУДНИКА
// ===============================


function checkEmployee(){


if(currentEmployee){


updateEmployee();


hide(
"employeeModal"
);


}

else{


show(
"employeeModal"
);


}



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

"guard_employee",

JSON.stringify(
currentEmployee
)

);




setText(

"employeeName",

fio

);



let avatar=$("avatar");


if(avatar){

avatar.textContent =
fio.substring(0,1)
.toUpperCase();

}





hide(
"employeeModal"
);



saveState();


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



let json =
await response.json();




if(Array.isArray(json)){

posts=json;

}

else if(json.posts){

posts=json.posts;

}

else if(json.data){

posts=json.data;

}



setText(
"apiStatus",
"Подключено"
);



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
// QR
// ===============================


async function startScanner(){



let reader=$("reader");


if(!reader){

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


function(text){


let match =
text.match(
/P-\d{3}/i
);



if(match){


let id =
match[0]
.toUpperCase();



scanner.stop()
.catch(()=>{});



hide("reader");


openPost(id);


}


}


);



}

catch(error){


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
"Введите ФИО"
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
2*60*60*1000
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
// ПРОВЕРКА
// ===============================


async function saveCheck(){


if(!currentEmployee ||
!currentPost){

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



if(hasIncident &&
description===""){


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


description:
description


});



if(result.success!==false){


alert(
"Отметка сохранена"
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



async function saveIncident(){



let description =
$("incidentDescription")
.value.trim();



if(!description){

alert(
"Введите описание"
);

return;

}




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


description:
description,


category:
$("incidentCategory2")
.value


});



alert(
"Происшествие отправлено"
);



closeIncident();



}





// ===============================
// API
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



return await response.json();



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



if(state){


currentEmployee =
state.employee ||
null;



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




let emp =
JSON.parse(

localStorage.getItem(
"guard_employee"
)

);



if(emp){

currentEmployee=emp;

}



}

catch(e){}



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
