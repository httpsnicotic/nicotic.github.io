const videos = [
{
id: 1,
title: "Episodio 1",
video: "videos/video1.mp4",
thumb: "thumbs/ep1.jpg",
fecha: "2026-06-01"
},
{
id: 2,
title: "Episodio 2",
video: "videos/video2.mp4",
thumb: "thumbs/ep2.jpg",
fecha: "2026-06-05"
},
{
id: 3,
title: "Episodio 3",
video: "videos/video3.mp4",
thumb: "thumbs/ep3.jpg",
fecha: "2026-07-01"
},
{
id: 4,
title: "Episodio 4",
video: "videos/video4.mp4",
thumb: "thumbs/ep4.jpg",
fecha: "2026-07-10"
}
];

function render(list){

const container = document.getElementById("container");
container.innerHTML = "";

const grupos = {};

list.forEach(v=>{

const fecha = new Date(v.fecha);

const anio = fecha.getFullYear();

const mes = fecha.toLocaleString("es-ES",{
month:"long"
});

if(!grupos[anio]){
grupos[anio]={};
}

if(!grupos[anio][mes]){
grupos[anio][mes]=[];
}

grupos[anio][mes].push(v);

});

Object.keys(grupos)
.sort((a,b)=>b-a)
.forEach(anio=>{

const yearBlock=document.createElement("div");
yearBlock.className="year";
yearBlock.innerHTML=`<h1>📁 ${anio}</h1>`;

container.appendChild(yearBlock);

Object.keys(grupos[anio]).forEach(mes=>{

const row=document.createElement("div");
row.className="row";

const titulo=document.createElement("h2");
titulo.className="folder";
titulo.innerHTML=`▶ ${mes.charAt(0).toUpperCase()+mes.slice(1)} (${grupos[anio][mes].length})`;

row.appendChild(titulo);

const scroll=document.createElement("div");
scroll.className="scroll";
scroll.style.display="none";

grupos[anio][mes].forEach(v=>{

const card=document.createElement("div");
card.className="card";

card.innerHTML=`
<img src="${v.thumb}">
<p>${v.title}</p>
`;

card.onclick=()=>{

window.open(v.video,"_blank");

};

scroll.appendChild(card);

});

titulo.onclick=()=>{

if(scroll.style.display==="none"){

scroll.style.display="flex";

titulo.innerHTML=`▼ ${mes.charAt(0).toUpperCase()+mes.slice(1)} (${grupos[anio][mes].length})`;

}else{

scroll.style.display="none";

titulo.innerHTML=`▶ ${mes.charAt(0).toUpperCase()+mes.slice(1)} (${grupos[anio][mes].length})`;

}

};

row.appendChild(scroll);

container.appendChild(row);

});

});

}

document.getElementById("search").addEventListener("input",(e)=>{

const value=e.target.value.toLowerCase();

const filtered=videos.filter(v=>
v.title.toLowerCase().includes(value)
);

render(filtered);

});

render(videos);
