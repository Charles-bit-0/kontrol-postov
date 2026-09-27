const API_URL =
  "https://script.google.com/macros/s/AKfycbxutkC2ZMlHOlhzelf7BzjPizHduFwUy8jCCrdAWCuQLvxdB4yVxNRVhf0T9ZIU9vYujA/exec";


let posts = [];
let employees = [];

let currentPost = null;
let currentEmployee = null;

let shiftStarted = false;
let lastCheckTime = null;
let nextCheckTime = null;


/*
===========================
  ЗАПУСК ПРИЛОЖЕНИЯ
===========================
*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    bindButtons();

    restoreState();

    updateTime();

    setInterval(
      updateTime,
      1000
    );

    await loadData();

    updateScreen();

  }
);



/*
===========================
  УТИЛИТЫ
===========================
*/

function $(id){

  return document.getElementById(id);

}


function text(id,value){

  const el=$(id);

  if(el){
    el.textContent=value;
  }

}


function show(id){

  const el=$(id);

  if(el){
    el.classList.remove("hidden");
  }

}


function hide(id){

  const el=$(id);

  if(el){
    el.classList.add("hidden");
  }

}



/*
===========================
  КНОПКИ
===========================
*/


function bindButtons(){


  const scan=$("scanBtn");

  if(scan){

    scan.onclick=startScanner;

  }


  const demo=$("demoBtn");

  if(demo){

    demo.onclick=()=>{

      openPost("P-001");

    };

  }



  const close=$("closeBtn");

  if(close){

    close.onclick=closeModal;

  }



  const shift=$("shiftBtn");

  if(shift){

    shift.onclick=startShift;

  }



  const save=$("saveBtn");

  if(save){

    save.onclick=saveCheck;

  }



  const incident=$("incidentBtn");

  if(incident){

    incident.onclick=openIncident;

  }



  const incidentSave=$("incidentSaveBtn");

  if(incidentSave){

    incidentSave.onclick=saveIncident;

  }



  const incidentClose=$("incidentCloseBtn");

  if(incidentClose){

    incidentClose.onclick=closeIncident;

  }


}



/*
===========================
  ЗАГРУЗКА GOOGLE SHEETS
===========================
*/


async function loadData(){

try{


const postsResponse =
await fetch(
 API_URL+"?action=posts"
);


const postsData =
await postsResponse.json();



/*
 Поддерживаем разные ответы API
*/


if(
 Array.isArray(postsData)
){

 posts=postsData;

}

else if(
 Array.isArray(postsData.posts)
){

 posts=postsData.posts;

}

else if(
 Array.isArray(postsData.data)
){

 posts=postsData.data;

}



const employeesResponse =
await fetch(
 API_URL+"?action=employees"
);



const employeesData =
await employeesResponse.json();



if(
 Array.isArray(employeesData)
){

 employees=employeesData;

}

else if(
 Array.isArray(employeesData.employees)
){

 employees=employeesData.employees;

}

else if(
 Array.isArray(employeesData.data)
){

 employees=employeesData.data;

}



console.log(
 "Посты:",
 posts
);


console.log(
 "Сотрудники:",
 employees
);



/*
 Берём первого сотрудника
*/


if(
 employees.length>0
){

 currentEmployee =
 normalizeEmployee(
  employees[0]
 );

}



updateEmployee();



}
catch(error){


console.error(
 "Ошибка загрузки",
 error
);


text(
 "apiStatus",
 "Ошибка подключения"
);


}


}



/*
===========================
  СОТРУДНИК
===========================
*/


function normalizeEmployee(e){


return {


id:
e.id ||
e.ID ||
e.employeeId ||
"",


name:
e.name ||
e.Нame ||
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


text(
"employeeName",
currentEmployee.name
);



const avatar=$("avatar");


if(avatar){

avatar.textContent =
currentEmployee.name
.charAt(0)
.toUpperCase();

}


}



/*
===========================
  ПОСТЫ
===========================
*/


function findPost(id){


return posts.find(
p=>{

return String(
p.id ||
p.ID ||
p.postId
)

===String(id);


}

);


}



function normalizePost(p){


return {


id:
p.id ||
p.ID ||
p.postId,


name:
p.name ||
p.title ||
p.postName ||
p["Название"] ||
("Пост "+p.id)


};


}



function openPost(id){


let post=findPost(id);



if(post){

currentPost=
normalizePost(post);

}

else{


currentPost={

id:id,

name:"Пост №"+
String(id)
.replace(/\D/g,"")

};


}



text(
"postName",
currentPost.name
);


text(
"postId",
currentPost.id
);



text(
"currentTime",
new Date()
.toLocaleString("ru-RU")
);



show("modal");



updateShiftButton();


}
/*
/*
===========================
  QR СКАНЕР
===========================
*/

let scanner = null;


async function startScanner(){

  const reader = $("reader");

  if(!reader){

    alert("Сканер не найден");

    return;

  }


  show("reader");


  try{


    scanner =
      new Html5Qrcode("reader");


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


      (decodedText)=>{

        let id = null;


        const match =
          decodedText.match(/P-\d{3}/i);


        if(match){

          id =
          match[0].toUpperCase();

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
===========================
  ЗАСТУПЛЕНИЕ НА ПОСТ
===========================
*/


async function startShift(){


if(!currentPost){

alert(
"Сначала выберите пост"
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


const result =
await sendToAPI({

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



if(
result.success===false
){

throw new Error(
result.message ||
"Ошибка сервера"
);

}



shiftStarted=true;


lastCheckTime=
new Date();



nextCheckTime=
new Date(
Date.now()
+
2*60*60*1000
);



saveState();


updateShiftButton();


updateScreen();



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


const btn=$("shiftBtn");


if(!btn){

return;

}



if(shiftStarted){


btn.textContent=
"Пост уже принят";


btn.disabled=true;


}
else{


btn.textContent=
"Заступить на пост";


btn.disabled=false;


}



}



/*
===========================
  ПРОВЕРКА КАЖДЫЕ 2 ЧАСА
===========================
*/


async function saveCheck(){



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



const incident =
document.querySelector(
'input[name="incidentYes"]:checked'
);



const hasIncident =
incident &&
incident.value==="yes";



const description =
$("checkDescription")
?
$("checkDescription").value.trim()
:
"";



const category =
$("incidentCategory")
?
$("incidentCategory").value
:
"";



if(
hasIncident &&
!description
){

alert(
"Опишите происшествие"
);

return;

}



try{


const result =
await sendToAPI({


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
hasIncident,


category:
category,


description:
description


});



if(
result.success===false
){

throw new Error(
result.message
);

}



lastCheckTime=
new Date();



nextCheckTime=
new Date(
Date.now()
+
2*60*60*1000
);



saveState();


updateScreen();


clearForm();



alert(
"Проверка зарегистрирована"
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




/*
===========================
  ПРОИСШЕСТВИЕ
===========================
*/


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



const description =
$("incidentDescription")
?
$("incidentDescription").value.trim()
:
"";



const category =
$("incidentCategory2")
?
$("incidentCategory2").value
:
"";



if(!description){

alert(
"Введите описание"
);

return;

}



try{


const result =
await sendToAPI({

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



if(
result.success===false
){

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





/*
===========================
  API
===========================
*/


async function sendToAPI(data){



const response =
await fetch(
API_URL,
{


method:
"POST",


headers:
{

"Content-Type":
"text/plain;charset=utf-8"

},


body:
JSON.stringify(data)


}
);



const text =
await response.text();



try{


return JSON.parse(text);


}
catch(e){


return {

success:false,

message:text

};


}


}





/*
===========================
  СОСТОЯНИЕ
===========================
*/


function saveState(){



localStorage.setItem(

"kontrolPostov",

JSON.stringify({

employee:
currentEmployee,


post:
currentPost,


shift:
shiftStarted,


last:
lastCheckTime
?
lastCheckTime.toISOString()
:
null,


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


const data =
JSON.parse(

localStorage.getItem(
"kontrolPostov"
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



if(data.last){

lastCheckTime=
new Date(data.last);

}



if(data.next){

nextCheckTime=
new Date(data.next);

}



}
catch(e){

console.log(e);

}



}





/*
===========================
  ЭКРАН
===========================
*/


function updateScreen(){



updateEmployee();



if(currentPost){


text(
"currentPost",
currentPost.name
);


}
else{


text(
"currentPost",
"Пост не выбран"
);


}



if(nextCheckTime){


text(

"mainNextCheck",

"Следующая проверка: "+
nextCheckTime.toLocaleString(
"ru-RU"
)

);


}
else{


text(

"mainNextCheck",

"После заступления на пост"

);


}



updateShiftButton();



}





function clearForm(){


const desc =
$("checkDescription");


if(desc){

desc.value="";

}



}





function closeModal(){


hide(
"modal"
);


}





function updateTime(){


text(

"currentTime",

new Date()
.toLocaleString(
"ru-RU"
)

);


}
