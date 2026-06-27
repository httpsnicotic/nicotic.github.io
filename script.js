document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       PARTICULAS
    ========================= */
    const particlesContainer = document.getElementById("tsparticles");

    if (particlesContainer && typeof tsParticles !== "undefined") {

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
       BOTÓN ENTER
    ========================= */
    const boton = document.getElementById("enterBtn");

    if (boton) {
        boton.addEventListener("click", () => {
            window.location.href = "portal.html";
        });
    }

    /* =========================
       BASE LOCAL
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
                const parsed = JSON.parse(saved);

                if (!parsed.videos) parsed.videos = {};
                if (!parsed.likedSkulls) parsed.likedSkulls = {};
                if (!parsed.totals) {
                    parsed.totals = {
                        videoViews: 0,
                        skulls: 0,
                        comments: 0
                    };
                }

                if (typeof parsed.portalVisits !== "number") {
                    parsed.portalVisits = 0;
                }

                if (!parsed.lastPortalVisitDay) {
                    parsed.lastPortalVisitDay = "";
                }

                return parsed;

            } catch (e) {
                console.warn("NICOTIC: error leyendo datos locales. Reiniciando.");
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

    function isPortalPage() {
        return Boolean(
            document.getElementById("mainVideo") ||
            document.getElementById("portalVisits") ||
            document.querySelector(".video-highlight-section")
        );
    }

    /* =========================
       INICIAR VIDEOS DESDE HTML
    ========================= */
    function initializeVideos() {
        const cards = document.querySelectorAll(".video-card");

        if (!cards.length) return;

        let recalculatedViews = 0;
        let recalculatedSkulls = 0;
        let recalculatedComments = 0;

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
            }

            if (!Array.isArray(state.videos[videoId].comments)) {
                state.videos[videoId].comments = [];
            }

            recalculatedViews += Number(state.videos[videoId].views || 0);
            recalculatedSkulls += Number(state.videos[videoId].skulls || 0);
            recalculatedComments += state.videos[videoId].comments.length || 0;
        });

        state.totals.videoViews = recalculatedViews;
        state.totals.skulls = recalculatedSkulls;
        state.totals.comments = recalculatedComments;

        saveState();
        refreshAllUI();
        setInitialVideoPoster();
    }

    function setInitialVideoPoster() {
        const activeCard = document.querySelector(".video-card.active-card");
        const mainVideo = document.getElementById("mainVideo");

        if (!activeCard || !mainVideo) return;

        const thumb = activeCard.querySelector(".thumb-video");

        if (thumb && thumb.getAttribute("src")) {
            mainVideo.setAttribute("poster", thumb.getAttribute("src"));
        }
    }

    /* =========================
       VISITAS AL PORTAL
    ========================= */
    function countPortalVisit() {
        if (!isPortalPage()) return;

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
       SELECCIONAR VIDEO
    ========================= */
    window.selectVideo = function(card) {
        if (!card) return;

        const videoId = card.dataset.videoId;
        const src = card.dataset.src;
        const title = card.dataset.title;
        const meta = card.dataset.meta;

        const video = document.getElementById("mainVideo");

        if (!video || !videoId || !src) return;

        clearTimeout(viewTimer);

        video.pause();
        video.src = src;
        video.dataset.currentVideo = videoId;

        const thumb = card.querySelector(".thumb-video");

        if (thumb && thumb.getAttribute("src")) {
            video.setAttribute("poster", thumb.getAttribute("src"));
        }

        video.load();

        const titleEl = document.getElementById("mainTitle");
        const metaEl = document.getElementById("mainMeta");

        if (titleEl) titleEl.textContent = title || "Episodio";
        if (metaEl) metaEl.textContent = meta || "reciente";

        const mainSkulls = document.getElementById("mainSkulls");
        if (mainSkulls) mainSkulls.dataset.videoId = videoId;

        document.querySelectorAll(".video-card").forEach(item => {
            item.classList.remove("active-card");
        });

        card.classList.add("active-card");

        refreshVideoUI(videoId);
        renderComments(videoId);
        refreshLikedButtons();
        animateFeaturedVideo();

        video.play().catch(() => {});
    };

    window.changeVideo = function(src) {
        const main = document.getElementById("mainVideo");

        if (!main) return;

        clearTimeout(viewTimer);

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

    function animateFeaturedVideo() {
        const shell = document.querySelector(".featured-video-shell");

        if (!shell) return;

        shell.classList.remove("video-switched");

        requestAnimationFrame(() => {
            shell.classList.add("video-switched");
        });

        setTimeout(() => {
            shell.classList.remove("video-switched");
        }, 700);
    }

    /* =========================
       VISTAS POR VIDEO
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
       CALAVERAS
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
        pulseButton("mainSkulls");
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
                skullBtn.classList.add("pulse-click");

                setTimeout(() => {
                    skullBtn.classList.remove("pulse-click");
                }, 350);
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

    function pulseButton(id) {
        const btn = document.getElementById(id);

        if (!btn) return;

        btn.classList.add("pulse-click");

        setTimeout(() => {
            btn.classList.remove("pulse-click");
        }, 350);
    }

    /* =========================
       COMENTARIOS PREMIUM
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

        const aliasInput = document.getElementById("commentAlias");
        const textInput = document.getElementById("commentText");

        const name = aliasInput
            ? aliasInput.value
            : "👁️ | Habitante del Sótano";

        const text = textInput ? cleanCommentText(textInput.value) : "";

        if (!text) return;

        const comment = {
            name: name,
            text: text.slice(0, 180),
            date: formatCommentDate()
        };

        state.videos[videoId].comments.push(comment);
        state.totals.comments++;

        if (textInput) textInput.value = "";

        saveState();
        renderComments(videoId);
        refreshCommentCounts(videoId);
        refreshTotals();
        pulseButton("sendCommentBtn");
    }

    function cleanCommentText(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 180);
    }

    function formatCommentDate() {
        return new Date().toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function renderComments(videoId) {
        const list = document.getElementById("commentList");
        if (!list) return;

        list.innerHTML = "";

        const comments = state.videos[videoId]?.comments || [];

        if (comments.length === 0) {
            list.innerHTML = `<div class="comment-item empty-comment">Sé el primero en comentar</div>`;
            return;
        }

        comments.slice().reverse().forEach(comment => {
            const item = document.createElement("div");
            item.className = "comment-item";

            const alias = getAliasData(comment.name);

            item.innerHTML = `
                <div class="comment-line">
                    <span class="comment-alias ${alias.badgeClass}">
                        <span class="alias-icon">${alias.icon}</span>
                        <span class="alias-divider">|</span>
                        <span class="alias-name ${alias.className}">${escapeHTML(alias.label)}</span>
                    </span>

                    <span class="comment-text">${escapeHTML(comment.text)}</span>
                </div>

                <span class="comment-date">${escapeHTML(comment.date || "")}</span>
            `;

            list.appendChild(item);
        });
    }

    function getAliasData(name) {
        const value = String(name || "");

        if (value.includes("Migajero")) {
            return {
                icon: "🍞",
                label: "Migajero del Sótano",
                className: "alias-migajero-text",
                badgeClass: "alias-migajero-badge"
            };
        }

        if (value.includes("Fantasma")) {
            return {
                icon: "👻",
                label: "Fantasma del Sótano",
                className: "alias-fantasma-text",
                badgeClass: "alias-fantasma-badge"
            };
        }

        if (value.includes("Habitante")) {
            return {
                icon: "👁️",
                label: "Habitante del Sótano",
                className: "alias-habitante-text",
                badgeClass: "alias-habitante-badge"
            };
        }

        return {
            icon: "👁️",
            label: "Habitante del Sótano",
            className: "alias-habitante-text",
            badgeClass: "alias-habitante-badge"
        };
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
                .find(el => el.textContent.includes("comentarios"));

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

    window.addComment = function() {
        sendComment();
    };

    window.likeVideo = function(id) {
        addSkull(id);
    };

    /* =========================
       ACTUALIZAR UI
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
       FULLSCREEN
    ========================= */
    const video = document.getElementById("mainVideo");

    if (video) {
        video.addEventListener("dblclick", () => {
            if (!document.fullscreenElement) {
                video.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    /* =========================
       SCROLL HORIZONTAL
    ========================= */
    const grid = document.querySelector(".video-grid");

    if (grid) {

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        grid.addEventListener("mousedown", (e) => {
            isDown = true;
            grid.classList.add("dragging");
            startX = e.pageX - grid.offsetLeft;
            scrollLeft = grid.scrollLeft;
        });

        grid.addEventListener("mouseup", () => {
            isDown = false;
            grid.classList.remove("dragging");
        });

        grid.addEventListener("mouseleave", () => {
            isDown = false;
            grid.classList.remove("dragging");
        });

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
        }, { passive: true });

        grid.addEventListener("touchmove", (e) => {
            const x = e.touches[0].clientX;
            const walk = (touchStartX - x) * 1.5;

            grid.scrollLeft = touchScrollLeft + walk;
        }, { passive: true });
    }

    /* =========================
       EFECTOS VISUALES EXTRA
    ========================= */
    function initVisualEffects() {
        const featuredSection = document.querySelector(".video-highlight-section");

        if (featuredSection) {
            featuredSection.addEventListener("mousemove", (e) => {
                const rect = featuredSection.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                featuredSection.style.setProperty("--mouse-x", `${x}%`);
                featuredSection.style.setProperty("--mouse-y", `${y}%`);
            });
        }

        document.querySelectorAll(".video-card").forEach(card => {
            card.addEventListener("mouseenter", () => {
                card.classList.add("card-hovering");
            });

            card.addEventListener("mouseleave", () => {
                card.classList.remove("card-hovering");
            });
        });
    }

    /* =========================
       BLOQUEO DE ZOOM EN MÓVIL
    ========================= */
    document.addEventListener("gesturestart", function (e) {
        e.preventDefault();
    });

    document.addEventListener("gesturechange", function (e) {
        e.preventDefault();
    });

    document.addEventListener("gestureend", function (e) {
        e.preventDefault();
    });

    document.addEventListener("dblclick", function (e) {
        if (e.target && e.target.tagName === "VIDEO") return;
        e.preventDefault();
    }, { passive: false });

    document.addEventListener("touchmove", function (e) {
        if (e.scale && e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener("touchstart", function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    /* =========================
       INICIAR TODO
    ========================= */
    initializeVideos();
    countPortalVisit();
    initVisualEffects();

});
