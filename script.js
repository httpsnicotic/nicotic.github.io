document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       🔥 PARTICULAS (TU CÓDIGO ORIGINAL)
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
                value: 45,
                density: { enable: true, area: 900 }
            },
            color: { value: "#8a2be2" },
            shape: { type: "circle" },
            opacity: { value: 0.65 },
            size: {
                value: 6,
                random: { enable: true, minimumValue: 3 }
            },
            move: {
                enable: true,
                speed: 1.3,
                random: true,
                direction: "none",
                straight: false,
                outModes: { default: "out" }
            },
            links: {
                enable: true,
                color: "#8a2be2",
                distance: 130,
                opacity: 0.3,
                width: 1
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
       🎬 SISTEMA VIDEO PRO
    ========================= */
    window.changeVideo = function(src){
        const main = document.getElementById("mainVideo");
        if (!main) return;

        main.pause();
        main.src = src;
        main.load();
        main.play();
    };

    /* =========================
       👍 LIKES (LOCAL STORAGE)
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
       📱 FULLSCREEN TIKTOK STYLE
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
       🚀 V4 PRO UPGRADE (NUEVO)
    ========================= */

    // 🔥 SWIPE NATURAL (MÓVIL)
    let startY = 0;
    let endY = 0;

    if (video) {
        video.addEventListener("touchstart", (e) => {
            startY = e.touches[0].clientY;
        });

        video.addEventListener("touchend", (e) => {
            endY = e.changedTouches[0].clientY;

            let diff = startY - endY;

            // swipe hacia arriba = siguiente video (FUTURO LISTO)
            if (diff > 50) {
                console.log("👉 swipe up detectado (listo para autoplay next)");
            }

            // swipe hacia abajo = pausa
            if (diff < -50) {
                video.pause();
            }
        });
    }

    // ⚡ AUTOPLAY NEXT (BASE LISTA)
    const videos = ["videos/video1.mp4", "videos/video2.mp4", "videos/video3.mp4"];

    video?.addEventListener("ended", () => {
        let current = videos.indexOf(video.getAttribute("src"));
        let next = videos[(current + 1) % videos.length];

        video.src = next;
        video.play();
    });

});
