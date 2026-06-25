document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       🔥 PARTICULAS (IGUAL, OPTIMIZADO)
    ========================= */
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
        const main = document.getElementById("mainVideo");
        if (!main) return;

        main.style.opacity = "0.2";

        setTimeout(() => {
            main.pause();
            main.src = src;
            main.load();
            main.play();
            main.style.opacity = "1";
        }, 150);
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
       🔥 V4.1 PRO – SWIPE REAL (TIKTOK BASE)
    ========================= */

    let startY = 0;
    let currentIndex = 0;

    const videos = [
        "videos/video1.mp4",
        "videos/video2.mp4",
        "videos/video3.mp4"
    ];

    if (video) {

        video.addEventListener("touchstart", (e) => {
            startY = e.touches[0].clientY;
        });

        video.addEventListener("touchend", (e) => {
            let endY = e.changedTouches[0].clientY;
            let diff = startY - endY;

            // 🔼 swipe arriba = siguiente video
            if (diff > 60) {
                nextVideo();
            }

            // 🔽 swipe abajo = anterior video
            if (diff < -60) {
                prevVideo();
            }
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
       🎬 AUTOPLAY NETFLIX STYLE
    ========================= */
    video?.addEventListener("ended", () => {
        nextVideo();
    });

});
