document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       🔥 PARTICULAS (OPTIMIZADO)
    ========================= */
if (typeof tsParticles !== "undefined") {

tsParticles.load("tsparticles", {

    fullScreen: { enable: true },
    background: { color: "transparent" },
    detectRetina: true,
    fpsLimit: 60,

    interactivity: {
        detectsOn: "window",
        events: {
            onHover: { enable: true, mode: "repulse" },
            onClick: { enable: true, mode: "push" },
            onTouch: { enable: true, mode: "repulse" },
            resize: true
        },
        modes: {
            repulse: { distance: 140, duration: 0.4 },
            push: { quantity: 2 }
        }
    },

    particles: {
        number: {
            value: 25,
            density: { enable: true, area: 1000 }
        },
        color: { value: "#8a2be2" },
        shape: { type: "circle" },
        opacity: { value: 0.6 },
        size: {
            value: 5,
            random: { enable: true, minimumValue: 2 }
        },
        move: {
            enable: true,
            speed: 1.2,
            random: true,
            outModes: { default: "out" }
        }
    }

});

}

    /* =========================
       🔘 BOTÓN ENTER
    ========================= */
    const boton = document.getElementById("enterBtn");

    if (boton) {
        boton.addEventListener("click", () => {
            window.location.href = "portal.html";
        });
    }

    /* =========================
       🎬 VIDEO SYSTEM BASE
    ========================= */
window.changeVideo = function(src){

    console.log("Intentando cargar:", src);

    const main = document.getElementById("mainVideo");

    if (!main){
        console.log("NO EXISTE mainVideo");
        return;
    }

    main.pause();

    main.src = src;

    console.log("SRC ACTUAL:", main.src);

    main.load();

    main.play()
        .then(() => {
            console.log("VIDEO CARGADO");
        })
        .catch(err => {
            console.error("ERROR VIDEO:", err);
        });

};

    /* =========================
       👍 LIKES
    ========================= */
    window.likeVideo = function(id){
        let likes = localStorage.getItem("like_" + id) || 0;
        likes++;
        localStorage.setItem("like_" + id, likes);

        const el = document.getElementById("likes-" + id);
        if (el) el.innerText = likes + " likes";
    };

    /* =========================
       💬 COMENTARIOS
    ========================= */
    window.addComment = function(id){
        const input = document.getElementById("input-" + id);
        const list = document.getElementById("comments-" + id);

        if (!input || input.value.trim() === "") return;

        const p = document.createElement("p");
        p.innerText = "💬 " + input.value;

        list.appendChild(p);
        input.value = "";
    };

    /* =========================
       📱 FULLSCREEN (TIKTOK STYLE)
    ========================= */
    const video = document.getElementById("mainVideo");

    if (video) {
        video.addEventListener("dblclick", () => {
            if (!document.fullscreenElement) {
                video.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    /* =========================
       🔥 V4.2 PRO – SWIPE TIKTOK
    ========================= */

    let startY = 0;
    let currentIndex = 0;

    const videos = [
        "videos/video1.mp4",
        "videos/video2.mp4",
        "videos/video3.mp4",
        "videos/video4.mp4",
        "videos/video5.mp4"
    ];

    if (video) {

        video.addEventListener("touchstart", (e) => {
            startY = e.touches[0].clientY;
        });

        video.addEventListener("touchend", (e) => {
            let endY = e.changedTouches[0].clientY;
            let diff = startY - endY;

            if (diff > 60) nextVideo();
            if (diff < -60) prevVideo();
        });

    }

    function nextVideo(){
        currentIndex++;
        if (currentIndex >= videos.length) currentIndex = 0;
        playVideo(currentIndex);
    }

    function prevVideo(){
        currentIndex--;
        if (currentIndex < 0) currentIndex = videos.length - 1;
        playVideo(currentIndex);
    }

    function playVideo(index){
        const main = document.getElementById("mainVideo");
        if (!main) return;

        main.style.transform = "scale(0.98)";
        main.style.opacity = "0.3";

        setTimeout(() => {
            main.src = videos[index];
            main.load();
            main.play();

            main.style.transform = "scale(1)";
            main.style.opacity = "1";
        }, 150);
    }

    /* =========================
       🎬 AUTOPLAY NETFLIX
    ========================= */
    video?.addEventListener("ended", () => {
        nextVideo();
    });

    /* =========================
       🎬 NETFLIX SCROLL (HORIZONTAL)
    ========================= */

    const grid = document.querySelector(".video-grid");

    if (grid) {

        let isDown = false;
        let startX;
        let scrollLeft;

        grid.addEventListener("mousedown", (e) => {
            isDown = true;
            startX = e.pageX - grid.offsetLeft;
            scrollLeft = grid.scrollLeft;
        });

        grid.addEventListener("mouseup", () => isDown = false);
        grid.addEventListener("mouseleave", () => isDown = false);

        grid.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();

            const x = e.pageX - grid.offsetLeft;
            const walk = (x - startX) * 2;

            grid.scrollLeft = scrollLeft - walk;
        });

        /* 📱 TOUCH */
        let touchStartX = 0;
        let touchScrollLeft = 0;

        grid.addEventListener("touchstart", (e) => {
            touchStartX = e.touches[0].clientX;
            touchScrollLeft = grid.scrollLeft;
        });

        grid.addEventListener("touchmove", (e) => {
            const x = e.touches[0].clientX;
            const walk = (touchStartX - x) * 1.5;

            grid.scrollLeft = touchScrollLeft + walk;
        });
    }

});
