const videos = [
{
id: 1,
title: "Episodio 1",
video: "videos/video1.mp4",
thumb: "thumbs/ep1.jpg",
season: "Temporada 1"
},
{
id: 2,
title: "Episodio 2",
video: "videos/video2.mp4",
thumb: "thumbs/ep2.jpg",
season: "Temporada 1"
},
{
id: 3,
title: "Episodio 3",
video: "videos/video3.mp4",
thumb: "thumbs/ep3.jpg",
season: "Temporada 1"
},
{
id: 4,
title: "Episodio 4",
video: "videos/video4.mp4",
thumb: "thumbs/ep4.jpg",
season: "Temporada 2"
}
];

function render(list){

const container = document.getElementById("container");
container.innerHTML = "";

const seasons = {};

list.forEach(v => {
if (!seasons[v.season]) seasons[v.season] = [];
seasons[v.season].push(v);
});

Object.keys(seasons).forEach(season => {

const row = document.createElement("div");
row.className = "row";

row.innerHTML = `<h2>${season}</h2>`;

const scroll = document.createElement("div");
scroll.className = "scroll";

seasons[season].forEach(v => {

const card = document.createElement("div");
card.className = "card";

card.innerHTML = `
<img src="${v.thumb}">
<p>${v.title}</p>
`;

card.onclick = () => {
window.open(v.video, "_blank");
};

scroll.appendChild(card);

});

row.appendChild(scroll);
container.appendChild(row);

});

}

document.getElementById("search").addEventListener("input", (e) => {

const value = e.target.value.toLowerCase();

const filtered = videos.filter(v =>
v.title.toLowerCase().includes(value)
);

render(filtered);

});

render(videos);
