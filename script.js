document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       🔥 PARTICULAS
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
       📦 BASE LOCAL
    ========================= */
    const STORAGE_KEY = "nicotic_stats_v1";
    const SESSION_VIEWS_KEY = "nicotic_session_views_v1";

    let state = loadState();
    let viewedThisSession = loadSessionViews();
    let viewTimer = null;

    function loadState() {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn("Error leyendo datos locales. Reiniciando.");
            }
        }

        return {
            portalVisits: 0,
            lastPortalVisitDay: "",
            videos: {},
            likedSkulls: {},
            totals: {
                videoViews: 0,
                skulls: 0,
                comments: 0
            }
        };
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadSessionViews() {
        const saved = sessionStorage.getItem(SESSION_VIEWS_KEY);

        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                return new Set();
            }
        }

        return new Set();
    }

    function saveSessionViews() {
        sessionStorage.setItem(
            SESSION_VIEWS_KEY,
            JSON.stringify([...viewedThisSession])
        );
    }

    function formatNumber(num) {
        return Number(num || 0).toLocaleString("es-PE");
    }

    /* =========================
       🎬 INICIAR VIDEOS DESDE HTML
    ========================= */
    function initializeVideos() {
        const cards = document.querySelectorAll(".video-card");

        cards.forEach(card => {
            const videoId = card.dataset.videoId;
            const baseViews = Number(card.dataset.views || 0);
            const baseSkulls = Number(card.dataset.skulls || 0);

            if (!videoId) return;

            if (!state.videos[videoId]) {
                state.videos[videoId] = {
                    views: baseViews,
                    skulls: baseSkulls,
                    comments: []
                };

                state.totals.videoViews += baseViews;
                state.totals.skulls += baseSkulls;
            }
        });

        saveState();
        refreshAllUI();
    }

    /* =========================
       👁️ VISITAS AL PORTAL
       Cuenta 1 vez por día por dispositivo
    ========================= */
    function countPortalVisit() {
        const today = new Date().toISOString().slice(0, 10);

        if (state.lastPortalVisitDay !== today) {
            state.portalVisits++;
            state.lastPortalVisitDay = today;
            saveState();
        }

        refreshPortalVisits();
    }

    function refreshPortalVisits() {
        const el = document.getElementById("portalVisits");
        if (el) el.textContent = formatNumber(state.portalVisits);
    }

    /* =========================
       🎬 SELECCIONAR VIDEO
    ========================= */
    window.selectVideo = function(card) {
        if (!card) return;

        const videoId = card.dataset.videoId;
        const src = card.dataset.src;
        const title = card.dataset.title;
        const meta = card.dataset.meta;

        const video = document.getElementById("mainVideo");

        if (!video || !videoId || !src) return;

        video.pause();
        video.src = src;
        video.dataset.currentVideo = videoId;
        video.load();

        document.getElementById("mainTitle").textContent = title || "Episodio";
        document.getElementById("mainMeta").textContent = meta || "reciente";

        const mainSkulls = document.getElementById("mainSkulls");
        if (mainSkulls) mainSkulls.dataset.videoId = videoId;

        document.querySelectorAll(".video-card").forEach(item => {
            item.classList.remove("active-card");
        });

        card.classList.add("active-card");

        refreshVideoUI(videoId);
        renderComments(videoId);

        video.play().catch(() => {});
    };

    /* Compatibilidad con funciones antiguas */
    window.changeVideo = function(src) {
        const main = document.getElementById("mainVideo");

        if (!main) return;

        main.pause();
        main.src = src;
        main.load();
        main.play().catch(() => {});
    };

    window.loadVideo = function(src, title, meta, skulls, comments, views) {
        window.changeVideo(src);

        const mainTitle = document.getElementById("mainTitle");
        const mainMeta = document.getElementById("mainMeta");
        const mainSkullCount = document.getElementById("mainSkullCount");
        const mainViewCount = document.getElementById("mainViewCount");

        if (mainTitle) mainTitle.textContent = title;
        if (mainMeta) mainMeta.textContent = meta;
        if (mainSkullCount) mainSkullCount.textContent = skulls;
        if (mainViewCount) mainViewCount.textContent = views;
    };

    /* =========================
       👁️ VISTAS POR VIDEO
       Suma cuando reproduce 3 segundos
    ========================= */
    const mainVideo = document.getElementById("mainVideo");

    if (mainVideo) {
        mainVideo.addEventListener("play", () => {
            const videoId = mainVideo.dataset.currentVideo;

            if (!videoId) return;
            if (viewedThisSession.has(videoId)) return;

            clearTimeout(viewTimer);

            viewTimer = setTimeout(() => {
                if (!mainVideo.paused && !viewedThisSession.has(videoId)) {
                    addView(videoId);
                    viewedThisSession.add(videoId);
                    saveSessionViews();
                }
            }, 3000);
        });

        mainVideo.addEventListener("pause", () => {
            clearTimeout(viewTimer);
        });

        mainVideo.addEventListener("ended", () => {
            clearTimeout(viewTimer);
        });
    }

    function addView(videoId) {
        if (!state.videos[videoId]) return;

        state.videos[videoId].views++;
        state.totals.videoViews++;

        saveState();
        refreshVideoUI(videoId);
        refreshTotals();
    }

    /* =========================
       ☠️ CALAVERAS
       1 vez por dispositivo
    ========================= */
    function addSkull(videoId) {
        if (!videoId) return;
        if (!state.videos[videoId]) return;

        if (state.likedSkulls[videoId]) {
            refreshLikedButtons();
            return;
        }

        state.videos[videoId].skulls++;
        state.totals.skulls++;
        state.likedSkulls[videoId] = true;

        saveState();
        refreshVideoUI(videoId);
        refreshTotals();
        refreshLikedButtons();
    }

    const mainSkullButton = document.getElementById("mainSkulls");

    if (mainSkullButton) {
        mainSkullButton.addEventListener("click", () => {
            const videoId = mainSkullButton.dataset.videoId;
            addSkull(videoId);
        });
    }

    document.querySelectorAll(".video-card").forEach(card => {
        const videoId = card.dataset.videoId;
        const skullBtn = card.querySelector(".skull-card-btn");

        if (skullBtn) {
            skullBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addSkull(videoId);
            });
        }
    });

    function refreshLikedButtons() {
        document.querySelectorAll(".video-card").forEach(card => {
            const videoId = card.dataset.videoId;
            const skullBtn = card.querySelector(".skull-card-btn");

            if (!skullBtn) return;

            if (state.likedSkulls[videoId]) {
                skullBtn.classList.add("liked");
            } else {
                skullBtn.classList.remove("liked");
            }
        });

        const currentVideo = getCurrentVideoId();
        const mainBtn = document.getElementById("mainSkulls");

        if (mainBtn && currentVideo && state.likedSkulls[currentVideo]) {
            mainBtn.classList.add("liked");
        } else if (mainBtn) {
            mainBtn.classList.remove("liked");
        }
    }

    /* =========================
       💬 COMENTARIOS ANÓNIMOS
    ========================= */
    const sendCommentBtn = document.getElementById("sendCommentBtn");

    if (sendCommentBtn) {
        sendCommentBtn.addEventListener("click", () => {
            sendComment();
        });
    }

    const commentTextInput = document.getElementById("commentText");

    if (commentTextInput) {
        commentTextInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                sendComment();
            }
        });
    }

    function sendComment() {
        const videoId = getCurrentVideoId();

        if (!videoId || !state.videos[videoId]) return;

        const nameInput = document.getElementById("commentName");
        const textInput = document.getElementById("commentText");

        const name = nameInput && nameInput.value.trim()
            ? nameInput.value.trim()
            : "Anónimo";

        const text = textInput ? textInput.value.trim() : "";

        if (!text) return;

        const comment = {
            name: name.slice(0, 30),
            text: text.slice(0, 180),
            date: new Date().toLocaleString("es-PE")
        };

        state.videos[videoId].comments.push(comment);
        state.totals.comments++;

        if (textInput) textInput.value = "";

        saveState();
        renderComments(videoId);
        refreshCommentCounts(videoId);
        refreshTotals();
    }

    function renderComments(videoId) {
        const list = document.getElementById("commentList");
        if (!list) return;

        list.innerHTML = "";

        const comments = state.videos[videoId]?.comments || [];

        if (comments.length === 0) {
            list.innerHTML = `<div class="comment-item">Sé el primero en comentar 👀</div>`;
            return;
        }

        comments.slice().reverse().forEach(comment => {
            const item = document.createElement("div");
            item.className = "comment-item";

            item.innerHTML = `
                <strong>${escapeHTML(comment.name)}</strong>
                <p>${escapeHTML(comment.text)}</p>
                <span>${escapeHTML(comment.date)}</span>
            `;

            list.appendChild(item);
        });
    }

    function refreshCommentCounts(videoId) {
        const count = state.videos[videoId]?.comments?.length || 0;

        const mainComments = document.getElementById("mainComments");
        const currentVideo = getCurrentVideoId();

        if (mainComments && currentVideo === videoId) {
            mainComments.textContent = `💬 ${count} comentarios`;
        }

        const card = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
        if (card) {
            const commentPill = [...card.querySelectorAll(".card-pill")]
                .find(el => el.textContent.includes("💬"));

            if (commentPill) {
                commentPill.textContent = `💬 ${count} comentarios`;
            }
        }
    }

    function escapeHTML(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /* Compatibilidad con comentarios antiguos */
    window.addComment = function(id) {
        sendComment();
    };

    /* Compatibilidad con likes antiguos */
    window.likeVideo = function(id) {
        addSkull(id);
    };

    /* =========================
       🔄 ACTUALIZAR UI
    ========================= */
    function getCurrentVideoId() {
        const video = document.getElementById("mainVideo");
        return video ? video.dataset.currentVideo : null;
    }

    function refreshVideoUI(videoId) {
        const data = state.videos[videoId];
        if (!data) return;

        const currentVideo = getCurrentVideoId();

        const skullSpan = document.getElementById(`skulls-${videoId}`);
        const viewsSpan = document.getElementById(`views-${videoId}`);

        if (skullSpan) skullSpan.textContent = formatNumber(data.skulls);
        if (viewsSpan) viewsSpan.textContent = formatNumber(data.views);

        if (currentVideo === videoId) {
            const mainSkullCount = document.getElementById("mainSkullCount");
            const mainViewCount = document.getElementById("mainViewCount");

            if (mainSkullCount) mainSkullCount.textContent = formatNumber(data.skulls);
            if (mainViewCount) mainViewCount.textContent = formatNumber(data.views);

            refreshCommentCounts(videoId);
        }
    }

    function refreshAllUI() {
        Object.keys(state.videos).forEach(videoId => {
            refreshVideoUI(videoId);
            refreshCommentCounts(videoId);
        });

        refreshTotals();
        refreshPortalVisits();
        refreshLikedButtons();

        const currentVideo = getCurrentVideoId() || "video1";
        renderComments(currentVideo);
    }

    function refreshTotals() {
        const totalViews = document.getElementById("totalVideoViews");
        const totalSkulls = document.getElementById("totalSkulls");
        const totalComments = document.getElementById("totalComments");

        if (totalViews) totalViews.textContent = formatNumber(state.totals.videoViews);
        if (totalSkulls) totalSkulls.textContent = formatNumber(state.totals.skulls);
        if (totalComments) totalComments.textContent = formatNumber(state.totals.comments);
    }

    /* =========================
       📱 FULLSCREEN
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
       🎬 SCROLL HORIZONTAL
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

    /* =========================
       🎥 PREVIEW MINIATURA
       Solo si la miniatura es video
    ========================= */
    document.querySelectorAll(".thumb-video").forEach(thumb => {

        if (thumb.tagName !== "VIDEO") return;

        thumb.addEventListener("mouseenter", () => {
            thumb.currentTime = 0;
            thumb.play();
        });

        thumb.addEventListener("mouseleave", () => {
            thumb.pause();
            thumb.currentTime = 0;
        });

    });

    /* =========================
       🚀 INICIAR TODO
    ========================= */
    initializeVideos();
    countPortalVisit();

});
