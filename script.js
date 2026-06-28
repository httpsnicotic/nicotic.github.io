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
            document.getElementById("portalVisitsHero") ||
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
       Firebase + respaldo local
    ========================= */
    function countPortalVisit() {
        if (!isPortalPage()) return;

        if (window.nicoticDb) {
            countFirebasePortalVisit();
            return;
        }

        countLocalPortalVisit();
    }

    function countLocalPortalVisit() {
        const today = new Date().toISOString().slice(0, 10);

        if (state.lastPortalVisitDay !== today) {
            state.portalVisits++;
            state.lastPortalVisitDay = today;
            saveState();
        }

        refreshPortalVisits();
    }

    function countFirebasePortalVisit() {
        const db = window.nicoticDb;
        const totalRef = db.ref("stats/portalVisitsTotal");
        const registeredKey = "nicotic_firebase_visitor_registered_v1";

        totalRef.on("value", snapshot => {
            const total = Number(snapshot.val() || 0);
            updatePortalVisitDisplays(total);
        });

        const alreadyRegistered = localStorage.getItem(registeredKey);

        if (alreadyRegistered) return;

        totalRef.transaction(current => {
            return Number(current || 0) + 1;
        }, (error, committed) => {
            if (!error && committed) {
                localStorage.setItem(registeredKey, "true");
            }

            if (error) {
                console.warn("NICOTIC: no se pudo actualizar contador Firebase.", error);
                countLocalPortalVisit();
            }
        });
    }

    function refreshPortalVisits() {
        updatePortalVisitDisplays(state.portalVisits);
    }

    function updatePortalVisitDisplays(value) {
        const formatted = formatNumber(value);

        const heroCounter = document.getElementById("portalVisitsHero");
        const bottomCounter = document.getElementById("portalVisits");

        if (heroCounter) heroCounter.textContent = formatted;
        if (bottomCounter) bottomCounter.textContent = formatted;
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
            id: "c_" + Date.now() + "_" + Math.random().toString(16).slice(2),
            name: name,
            text: text.slice(0, 180),
            date: formatCommentDate(),
            likes: 0,
            likedByMe: false,
            ownerReplies: []
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
            if (!comment.id) comment.id = "c_" + Date.now() + "_" + Math.random().toString(16).slice(2);
            if (typeof comment.likes !== "number") comment.likes = 0;
            if (!Array.isArray(comment.ownerReplies)) comment.ownerReplies = [];

            const item = document.createElement("div");
            item.className = "comment-item";

            const alias = getAliasData(comment.name);
            const isOwner = String(comment.name || "").toLowerCase().includes("owner") || String(comment.name || "").toLowerCase().includes("nicotic");

            item.innerHTML = `
                <div class="comment-line ${isOwner ? "owner-comment" : ""}">
                    <span class="comment-alias ${alias.badgeClass}">
                        <span class="alias-icon">${alias.icon}</span>
                        <span class="alias-divider">|</span>
                        <span class="alias-name ${alias.className}">${escapeHTML(alias.label)}</span>
                    </span>

                    <span class="comment-text">${escapeHTML(comment.text)}</span>
                </div>

                <div class="comment-actions-row">
                    <button class="comment-like-btn ${comment.likedByMe ? "liked" : ""}" type="button" data-comment-id="${escapeHTML(comment.id)}">
                        ♡ <span>${formatNumber(comment.likes || 0)}</span>
                    </button>
                    <span class="comment-date">${escapeHTML(comment.date || "")}</span>
                </div>

                ${comment.ownerReplies.map(reply => `
                    <div class="owner-reply">
                        <strong>NICOTIC OWNER ✓</strong>
                        <span>${escapeHTML(reply.text || "")}</span>
                    </div>
                `).join("")}
            `;

            const likeBtn = item.querySelector(".comment-like-btn");
            if (likeBtn) {
                likeBtn.onclick = () => toggleCommentLike(videoId, comment.id);
            }

            list.appendChild(item);
        });

        saveState();
    }

    function toggleCommentLike(videoId, commentId) {
        const comments = state.videos[videoId]?.comments || [];
        const comment = comments.find(item => item.id === commentId);
        if (!comment) return;

        comment.likedByMe = !comment.likedByMe;
        comment.likes = Math.max(0, Number(comment.likes || 0) + (comment.likedByMe ? 1 : -1));

        saveState();
        renderComments(videoId);
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
        const heroVideosTotal = document.getElementById("heroVideosTotal");
        const heroSkullsTotal = document.getElementById("heroSkullsTotal");

        const videosCount = document.querySelectorAll(".video-card").length;

        if (totalViews) totalViews.textContent = formatNumber(state.totals.videoViews);
        if (totalSkulls) totalSkulls.textContent = formatNumber(state.totals.skulls);
        if (totalComments) totalComments.textContent = formatNumber(state.totals.comments);

        if (heroVideosTotal) heroVideosTotal.textContent = formatNumber(videosCount);
        if (heroSkullsTotal) heroSkullsTotal.textContent = formatNumber(state.totals.skulls);
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
       AVISOS / NOVEDADES
       Firebase: portal/avisosNovedades
    ========================= */
    let noticesTimers = [];

    const fallbackNotice = {
        id: "aviso_1",
        active: true,
        type: "normal",
        kicker: "Avisos / Novedades",
        title: "Hoy estaré en Trujillo",
        place: "Centro de Trujillo",
        description: "Estaré grabando algo especial para el sótano.",
        dateTime: "2026-07-10T17:00:00-05:00",
        imageUrl: "ojo.jpg",
        videoUrl: "",
        expireAfterHours: 6,
        startedText: "Ya comenzó"
    };

    function initLocationAlert() {
        // Compatibilidad interna: ahora el portal usa SOLO Avisos / Novedades.
        initNoticesCarousel();
    }

    function initNoticesCarousel() {
        const section = document.getElementById("noticesSection");
        if (!section) return;

        hideNoticesCarousel();

        if (window.nicoticDb) {
            window.nicoticDb.ref("portal/avisosNovedades").on("value", snapshot => {
                const data = snapshot.val();

                // Sistema nuevo:
                // portal/avisosNovedades/mostrarTodos = true/false
                // portal/avisosNovedades/items = 4 avisos
                if (!data || data.mostrarTodos !== true) {
                    hideNoticesCarousel();
                    return;
                }

                renderNoticesCarousel(data);
            }, error => {
                console.warn("NICOTIC: no se pudo leer avisosNovedades.", error);
                hideNoticesCarousel();
            });

            return;
        }

        hideNoticesCarousel();
    }

    function renderNoticesCarousel(data) {
        const section = document.getElementById("noticesSection");
        const track = document.getElementById("noticesTrack");

        if (!section || !track) return;

        clearNoticesTimers();

        const rawItems = Array.isArray(data.items)
            ? data.items
            : Object.values(data.items || {});

        const activeNotices = rawItems.filter(item => item && item.active === true);

        if (data.mostrarTodos !== true || !activeNotices.length) {
            hideNoticesCarousel();
            return;
        }

        track.innerHTML = "";

        activeNotices.slice(0, 4).forEach((notice, index) => {
            const card = document.createElement("article");
            card.className = `notice-card ${notice.type === "important" ? "notice-important" : ""}`;
            card.dataset.noticeIndex = String(index);

            const media = document.createElement("div");
            media.className = "notice-media";
            renderAlertMedia(media, notice);

            const toggle = document.createElement("button");
            toggle.className = "notice-toggle";
            toggle.type = "button";
            toggle.innerHTML = 'Ver foto completa <span>⌄</span>';

            toggle.onclick = () => {
                const expanded = card.classList.toggle("expanded");
                toggle.innerHTML = expanded ? 'Ocultar foto <span>⌃</span>' : 'Ver foto completa <span>⌄</span>';
            };

            const content = document.createElement("div");
            content.className = "notice-content";

            const countdownId = `noticeCountdown_${index}`;

            content.innerHTML = `
                <div class="notice-kicker">${escapeHTML(notice.kicker || "Avisos / Novedades")}</div>
                <h3>${escapeHTML(notice.title || "Aviso del sótano")}</h3>
                ${notice.place ? `<div class="notice-place">${escapeHTML(notice.place)}</div>` : ""}
                <p>${escapeHTML(notice.description || "")}</p>
                ${notice.dateTime ? `
                    <div class="notice-countdown">
                        <span>Faltan</span>
                        <strong id="${countdownId}">--d --h --m</strong>
                    </div>
                ` : ""}
            `;

            card.appendChild(media);
            card.appendChild(toggle);
            card.appendChild(content);
            track.appendChild(card);

            if (notice.dateTime) {
                startNoticeCountdown(notice, countdownId, card);
            }
        });

        section.classList.remove("nicotic-alert-hidden");
    }

    function startNoticeCountdown(notice, countdownId, card) {
        const countdown = document.getElementById(countdownId);
        if (!countdown) return;

        const targetDate = new Date(notice.dateTime);
        const expireAfterHours = Number(notice.expireAfterHours || 0);

        function update() {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (Number.isNaN(targetDate.getTime())) {
                countdown.textContent = "--d --h --m";
                return;
            }

            if (diff <= 0) {
                countdown.textContent = notice.startedText || "Ya comenzó";

                if (expireAfterHours > 0) {
                    const expireAt = targetDate.getTime() + expireAfterHours * 60 * 60 * 1000;
                    if (now.getTime() > expireAt && card) {
                        card.remove();
                        const track = document.getElementById("noticesTrack");
                        if (track && !track.children.length) hideNoticesCarousel();
                    }
                }

                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);

            countdown.textContent = `${days}d ${hours}h ${minutes}m`;
        }

        update();
        noticesTimers.push(setInterval(update, 60000));
    }

    function clearNoticesTimers() {
        noticesTimers.forEach(timer => clearInterval(timer));
        noticesTimers = [];
    }

    function hideNoticesCarousel() {
        clearNoticesTimers();

        const section = document.getElementById("noticesSection");
        const track = document.getElementById("noticesTrack");

        if (track) track.innerHTML = "";
        if (section) section.classList.add("nicotic-alert-hidden");
    }


    /* =========================
       EVENTO GRANDE / VIAJE / MISIÓN ESPECIAL
       Firebase: portal/alerts/featuredEvent
    ========================= */
    let featuredEventTimer = null;

    const featuredEventDemo = {
        active: false,
        title: "Viaje a Japón",
        subtitle: "Misión especial",
        description: "Se viene contenido fuera del sótano. Esto será parte de una etapa especial de NICOTIC.",
        dateTime: "2026-12-20T08:00:00-05:00",
        imageUrl: "ojo.jpg",
        videoUrl: "",
        buttonText: "Ver más",
        buttonUrl: "",
        startedText: "LA MISIÓN COMENZÓ"
    };

    function initFeaturedEvent() {
        const section = document.getElementById("featuredEventSection");

        if (!section) return;

        hideFeaturedEvent();

        if (window.nicoticDb) {
            window.nicoticDb.ref("portal/alerts/featuredEvent").on("value", snapshot => {
                const data = snapshot.val();

                if (!data || data.active !== true) {
                    hideFeaturedEvent();
                    return;
                }

                renderFeaturedEvent(data);
            }, error => {
                console.warn("NICOTIC: no se pudo leer featuredEvent.", error);
                renderFeaturedEvent(featuredEventDemo);
            });

            return;
        }

        renderFeaturedEvent(featuredEventDemo);
    }

    function renderFeaturedEvent(data) {
        const section = document.getElementById("featuredEventSection");
        const title = document.getElementById("featuredEventTitle");
        const subtitle = document.getElementById("featuredEventSubtitle");
        const description = document.getElementById("featuredEventDescription");
        const media = document.getElementById("featuredEventMedia");
        const button = document.getElementById("featuredEventButton");

        if (!section) return;

        if (!data || data.active !== true) {
            hideFeaturedEvent();
            return;
        }

        if (title) title.textContent = data.title || "Evento especial";
        if (subtitle) subtitle.textContent = data.subtitle || "Misión especial";
        if (description) description.textContent = data.description || "Se viene algo especial para el sótano.";

        renderFeaturedEventMedia(media, data);
        renderFeaturedEventButton(button, data);

        section.classList.remove("nicotic-alert-hidden");
        startFeaturedEventCountdown(data);
    }

    function renderFeaturedEventMedia(media, data) {
        if (!media) return;

        const imageUrl = String(data.imageUrl || "").trim();
        const videoUrl = String(data.videoUrl || "").trim();

        media.innerHTML = "";

        if (videoUrl) {
            const video = document.createElement("video");
            video.src = videoUrl;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = "metadata";
            media.appendChild(video);
            return;
        }

        if (imageUrl) {
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = data.title || "Evento NICOTIC";
            img.loading = "lazy";
            media.appendChild(img);
        }
    }

    function renderFeaturedEventButton(button, data) {
        if (!button) return;

        const buttonText = String(data.buttonText || "").trim();
        const buttonUrl = String(data.buttonUrl || "").trim();

        if (!buttonText || !buttonUrl) {
            button.classList.add("nicotic-alert-hidden");
            button.removeAttribute("href");
            return;
        }

        button.textContent = buttonText;
        button.href = buttonUrl;
        button.classList.remove("nicotic-alert-hidden");
    }

    function startFeaturedEventCountdown(data) {
        clearInterval(featuredEventTimer);

        updateFeaturedEventCountdown(data);

        featuredEventTimer = setInterval(() => {
            updateFeaturedEventCountdown(data);
        }, 1000);
    }

    function updateFeaturedEventCountdown(data) {
        const section = document.getElementById("featuredEventSection");
        const countdown = document.getElementById("featuredEventCountdown");
        const started = document.getElementById("featuredEventStarted");

        const daysEl = document.getElementById("featuredEventDays");
        const hoursEl = document.getElementById("featuredEventHours");
        const minutesEl = document.getElementById("featuredEventMinutes");
        const secondsEl = document.getElementById("featuredEventSeconds");

        if (!section || !countdown || !started) return;

        const target = new Date(data.dateTime || "").getTime();

        if (!target || Number.isNaN(target)) {
            if (daysEl) daysEl.textContent = "--";
            if (hoursEl) hoursEl.textContent = "--";
            if (minutesEl) minutesEl.textContent = "--";
            if (secondsEl) secondsEl.textContent = "--";
            countdown.classList.remove("nicotic-alert-hidden");
            started.classList.add("nicotic-alert-hidden");
            section.classList.remove("featured-event-ended");
            return;
        }

        const diff = target - Date.now();

        if (diff <= 0) {
            countdown.classList.add("nicotic-alert-hidden");
            started.textContent = data.startedText || "LA MISIÓN COMENZÓ";
            started.classList.remove("nicotic-alert-hidden");
            section.classList.add("featured-event-ended");
            return;
        }

        section.classList.remove("featured-event-ended");
        countdown.classList.remove("nicotic-alert-hidden");
        started.classList.add("nicotic-alert-hidden");

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (daysEl) daysEl.textContent = padTime(days);
        if (hoursEl) hoursEl.textContent = padTime(hours);
        if (minutesEl) minutesEl.textContent = padTime(minutes);
        if (secondsEl) secondsEl.textContent = padTime(seconds);
    }

    function hideFeaturedEvent() {
        const section = document.getElementById("featuredEventSection");

        if (section) {
            section.classList.add("nicotic-alert-hidden");
            section.classList.remove("featured-event-ended");
        }

        clearInterval(featuredEventTimer);
    }




    /* =========================
       NUEVO EPISODIO DISPONIBLE
       Firebase: portal/alerts/newEpisode
    ========================= */
    function initNewEpisodeAlert() {
        const section = document.getElementById("newEpisodeSection");
        if (!section) return;

        hideNewEpisodeAlert();

        if (window.nicoticDb) {
            window.nicoticDb.ref("portal/alerts/newEpisode").on("value", snapshot => {
                const data = snapshot.val();

                if (!data || data.active !== true) {
                    hideNewEpisodeAlert();
                    return;
                }

                renderNewEpisodeAlert(data);
            }, error => {
                console.warn("NICOTIC: no se pudo leer newEpisode.", error);
                hideNewEpisodeAlert();
            });
        }
    }

    function renderNewEpisodeAlert(data) {
        const section = document.getElementById("newEpisodeSection");
        const title = document.getElementById("newEpisodeTitle");
        const description = document.getElementById("newEpisodeDescription");
        const media = document.getElementById("newEpisodeMedia");
        const button = document.getElementById("newEpisodeButton");
        const cardButton = document.getElementById("newEpisodeCardButton");

        if (!section) return;

        if (title) title.textContent = data.title || "NEW EPISODIO";
        if (description) description.textContent = data.description || "Disponible";

        renderGeneralAlertMedia(media, data);

        const goToEpisode = () => {
            const videoSection = document.getElementById("videoSection") || document.querySelector(".video-highlight-section");
            if (videoSection) videoSection.scrollIntoView({ behavior: "smooth", block: "start" });
        };

        if (button) {
            button.textContent = data.buttonText || "Ver ahora";
            button.onclick = goToEpisode;
        }

        if (cardButton) {
            cardButton.onclick = goToEpisode;
        }

        section.classList.remove("nicotic-alert-hidden");
    }

    function hideNewEpisodeAlert() {
        const section = document.getElementById("newEpisodeSection");
        if (section) section.classList.add("nicotic-alert-hidden");
    }

    /* =========================
       STREAM / EN VIVO
       Firebase: portal/alerts/streamAlert
    ========================= */
    function initStreamAlert() {
        const section = document.getElementById("streamAlertSection");
        if (!section) return;

        hideStreamAlert();

        if (window.nicoticDb) {
            window.nicoticDb.ref("portal/alerts/streamAlert").on("value", snapshot => {
                const data = snapshot.val();

                if (!data || data.active !== true) {
                    hideStreamAlert();
                    return;
                }

                renderStreamAlert(data);
            }, error => {
                console.warn("NICOTIC: no se pudo leer streamAlert.", error);
                hideStreamAlert();
            });
        }
    }

    function renderStreamAlert(data) {
        const section = document.getElementById("streamAlertSection");
        const status = document.getElementById("streamAlertStatus");
        const title = document.getElementById("streamAlertTitle");
        const platform = document.getElementById("streamAlertPlatform");
        const description = document.getElementById("streamAlertDescription");
        const media = document.getElementById("streamAlertMedia");
        const button = document.getElementById("streamAlertButton");

        if (!section) return;

        if (status) status.textContent = data.live === false ? "PRÓXIMO STREAM" : "EN VIVO";
        if (title) title.textContent = data.title || "Estoy en vivo";
        if (platform) platform.textContent = data.platform || "KICK";
        if (description) description.textContent = data.description || "Estoy en directo ahora mismo desde el sótano.";

        renderGeneralAlertMedia(media, data);

        if (button) {
            const url = String(data.url || "https://kick.com/niicotic").trim();
            button.textContent = data.buttonText || "Ir";

            if (url) {
                button.href = url;
                button.classList.remove("nicotic-alert-hidden");
            } else {
                button.href = "#";
                button.classList.add("nicotic-alert-hidden");
            }
        }

        section.classList.remove("nicotic-alert-hidden");
    }

    function hideStreamAlert() {
        const section = document.getElementById("streamAlertSection");
        if (section) section.classList.add("nicotic-alert-hidden");
    }

    /* =========================
       MEDIA GENERAL PARA AVISOS
    ========================= */
    function renderGeneralAlertMedia(media, data) {
        if (!media) return;

        const imageUrl = String(data.imageUrl || "").trim();
        const videoUrl = String(data.videoUrl || "").trim();

        media.innerHTML = "";

        if (videoUrl) {
            const video = document.createElement("video");
            video.src = videoUrl;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.setAttribute("playsinline", "");
            video.setAttribute("muted", "");
            media.appendChild(video);
            media.style.display = "";
            return;
        }

        if (imageUrl) {
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = "Aviso NICOTIC";
            media.appendChild(img);
            media.style.display = "";
            return;
        }

        media.style.display = "none";
    }




    /* =========================
       MÚSICA FLOTANTE
       Usa archivo MP3 local para evitar problemas con YouTube y reducir lag.
    ========================= */
    function initFloatingMusic() {
        const button = document.getElementById("musicFloatButton");
        const icon = button ? button.querySelector(".music-float-icon") : null;
        const text = button ? button.querySelector(".music-float-text") : null;

        if (!button) return;

        const audioFile = "Provoker - Dark Angel (Official Video) HD.mp3";
        const audio = new Audio(audioFile);

        audio.loop = true;
        audio.preload = "metadata";
        audio.volume = 0.45;

        let playing = false;

        function setPausedState() {
            playing = false;
            button.classList.remove("is-playing");
            button.setAttribute("aria-pressed", "false");
            if (icon) icon.textContent = "🎧";
            if (text) text.textContent = "Música";
        }

        function setPlayingState() {
            playing = true;
            button.classList.add("is-playing");
            button.setAttribute("aria-pressed", "true");
            if (icon) icon.textContent = "❚❚";
            if (text) text.textContent = "Sonando";
        }

        setPausedState();

        button.addEventListener("click", async () => {
            try {
                if (!playing) {
                    await audio.play();
                    setPlayingState();
                } else {
                    audio.pause();
                    setPausedState();
                }
            } catch (error) {
                console.warn("NICOTIC: el navegador bloqueó la música o no encontró el MP3.", error);
                setPausedState();
            }
        });

        audio.addEventListener("ended", setPausedState);
        audio.addEventListener("pause", () => {
            if (!audio.ended) setPausedState();
        });
    }




    /* =========================
       HORARIOS + BANDERAS
    ========================= */
    const nicoticCountries = [
        { key:"mexico", flag:"🇲🇽", name:"México (CDMX)", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["mexico","méxico","cdmx"] },
        { key:"guatemala", flag:"🇬🇹", name:"Guatemala", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["guatemala"] },
        { key:"elsalvador", flag:"🇸🇻", name:"El Salvador", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["el salvador","salvador"] },
        { key:"nicaragua", flag:"🇳🇮", name:"Nicaragua", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["nicaragua"] },
        { key:"costarica", flag:"🇨🇷", name:"Costa Rica", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["costa rica"] },
        { key:"honduras", flag:"🇭🇳", name:"Honduras", group:"latam", pc:"6:30 PM", phone:"10:00 PM", aliases:["honduras"] },
        { key:"peru", flag:"🇵🇪", name:"Perú", group:"latam", pc:"7:30 PM", phone:"11:00 PM", aliases:["peru","perú"] },
        { key:"colombia", flag:"🇨🇴", name:"Colombia", group:"latam", pc:"7:30 PM", phone:"11:00 PM", aliases:["colombia"] },
        { key:"ecuador", flag:"🇪🇨", name:"Ecuador", group:"latam", pc:"7:30 PM", phone:"11:00 PM", aliases:["ecuador"] },
        { key:"panama", flag:"🇵🇦", name:"Panamá", group:"latam", pc:"7:30 PM", phone:"11:00 PM", aliases:["panama","panamá"] },
        { key:"cuba", flag:"🇨🇺", name:"Cuba", group:"latam", pc:"7:30 PM", phone:"12:00 AM (Medianoche)", aliases:["cuba"] },
        { key:"venezuela", flag:"🇻🇪", name:"Venezuela", group:"latam", pc:"8:30 PM", phone:"12:00 AM (Medianoche)", aliases:["venezuela"] },
        { key:"bolivia", flag:"🇧🇴", name:"Bolivia", group:"latam", pc:"8:30 PM", phone:"12:00 AM (Medianoche)", aliases:["bolivia"] },
        { key:"paraguay", flag:"🇵🇾", name:"Paraguay", group:"latam", pc:"8:30 PM", phone:"12:00 AM (Medianoche)", aliases:["paraguay"] },
        { key:"puertorico", flag:"🇵🇷", name:"Puerto Rico", group:"latam", pc:"8:30 PM", phone:"12:00 AM (Medianoche)", aliases:["puerto rico"] },
        { key:"dominicana", flag:"🇩🇴", name:"Rep. Dominicana", group:"latam", pc:"8:30 PM", phone:"12:00 AM (Medianoche)", aliases:["rep dominicana","republica dominicana","república dominicana","dominicana"] },
        { key:"argentina", flag:"🇦🇷", name:"Argentina", group:"latam", pc:"9:30 PM", phone:"1:00 AM (Madrugada)", aliases:["argentina"] },
        { key:"chile", flag:"🇨🇱", name:"Chile", group:"latam", pc:"9:30 PM", phone:"12:00 AM (Medianoche)", aliases:["chile"] },
        { key:"uruguay", flag:"🇺🇾", name:"Uruguay", group:"latam", pc:"9:30 PM", phone:"1:00 AM (Madrugada)", aliases:["uruguay"] },
        { key:"brasil", flag:"🇧🇷", name:"Brasil (São Paulo)", group:"latam", pc:"9:30 PM", phone:"1:00 AM (Madrugada)", aliases:["brasil","brazil","sao paulo","são paulo"] },
        { key:"usa-la", flag:"🇺🇸", name:"Los Ángeles / California", group:"world", pc:"5:30 PM", phone:"8:00 PM", aliases:["los angeles","ángeles","california","usa la"] },
        { key:"usa-texas", flag:"🇺🇸", name:"Texas", group:"world", pc:"6:30 PM", phone:"10:00 PM", aliases:["texas","usa texas"] },
        { key:"usa-ny", flag:"🇺🇸", name:"Nueva York", group:"world", pc:"7:30 PM", phone:"11:00 PM", aliases:["nueva york","new york","ny"] },
        { key:"canada", flag:"🇨🇦", name:"Canadá (Toronto)", group:"world", pc:"7:30 PM", phone:"11:00 PM", aliases:["canada","canadá","toronto"] },
        { key:"reino-unido", flag:"🇬🇧", name:"Reino Unido (Londres)", group:"world", pc:"1:30 AM (Día siguiente)", phone:"5:00 AM (Madrugada)", aliases:["reino unido","londres","uk","inglaterra"] },
        { key:"espana", flag:"🇪🇸", name:"España (Madrid)", group:"world", pc:"2:30 AM (Día siguiente)", phone:"6:00 AM (Mañana)", aliases:["espana","españa","madrid"] },
        { key:"francia", flag:"🇫🇷", name:"Francia", group:"world", pc:"2:30 AM (Día siguiente)", phone:"6:00 AM (Mañana)", aliases:["francia","france"] },
        { key:"italia", flag:"🇮🇹", name:"Italia", group:"world", pc:"2:30 AM (Día siguiente)", phone:"6:00 AM (Mañana)", aliases:["italia","italy"] },
        { key:"alemania", flag:"🇩🇪", name:"Alemania", group:"world", pc:"2:30 AM (Día siguiente)", phone:"6:00 AM (Mañana)", aliases:["alemania","germany","deutschland"] }
    ];

    let currentScheduleMode = "pc";
    let selectedScheduleCountry = null;

    function normalizeCountryText(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function initScheduleTools() {
        const section = document.getElementById("scheduleSection");
        if (!section) return;

        renderScheduleMode();
        renderFlagLists();
        renderViewerFlags();
        bindScheduleEvents();
        listenViewerCountryVotes();
    }

    function bindScheduleEvents() {
        const pcButton = document.getElementById("scheduleModePc");
        const phoneButton = document.getElementById("scheduleModePhone");
        const search = document.getElementById("countryScheduleSearch");
        const flagToggle = document.getElementById("flagListToggle");
        const flagCard = flagToggle ? flagToggle.closest(".flag-list-card") : null;

        [pcButton, phoneButton].forEach(button => {
            if (!button) return;
            button.onclick = () => {
                currentScheduleMode = button.dataset.mode || "pc";
                renderScheduleMode();
                renderCountrySearchResults(search ? search.value : "");
                if (selectedScheduleCountry) showCountryTime(selectedScheduleCountry);
            };
        });

        if (search) {
            search.addEventListener("input", () => renderCountrySearchResults(search.value));
            search.addEventListener("focus", () => renderCountrySearchResults(search.value));
        }

        if (flagToggle && flagCard) {
            flagToggle.onclick = () => {
                const open = flagCard.classList.toggle("open");
                flagToggle.setAttribute("aria-expanded", open ? "true" : "false");
                flagToggle.innerHTML = open ? 'Lista de banderas <span>⌃</span>' : 'Lista de banderas <span>⌄</span>';
            };
        }
    }

    function renderScheduleMode() {
        const pcButton = document.getElementById("scheduleModePc");
        const phoneButton = document.getElementById("scheduleModePhone");
        const title = document.getElementById("scheduleModeTitle");
        const days = document.getElementById("scheduleDaysText");
        const peruTime = document.getElementById("schedulePeruTime");

        if (pcButton) pcButton.classList.toggle("active", currentScheduleMode === "pc");
        if (phoneButton) phoneButton.classList.toggle("active", currentScheduleMode === "phone");

        if (currentScheduleMode === "pc") {
            if (title) title.textContent = "PC";
            if (days) days.textContent = "Lunes - Miércoles - Viernes";
            if (peruTime) peruTime.textContent = "7:30 PM Hora Perú 🇵🇪";
        } else {
            if (title) title.textContent = "Phone";
            if (days) days.textContent = "Sábado - Martes - Jueves";
            if (peruTime) peruTime.textContent = "11:00 PM Hora Perú 🇵🇪";
        }
    }

    function renderCountrySearchResults(query) {
        const results = document.getElementById("countryScheduleResults");
        if (!results) return;

        const clean = normalizeCountryText(query);

        let matches = [];

        if (!clean) {
            matches = nicoticCountries.filter(country => ["peru", "mexico", "usa-ny", "espana"].includes(country.key));
        } else {
            matches = nicoticCountries
                .map(country => {
                    const names = [country.name, ...(country.aliases || [])].map(normalizeCountryText);
                    const exact = names.some(name => name === clean);
                    const starts = names.some(name => name.startsWith(clean));
                    const wordStarts = names.some(name => name.split(/\s+|\/|\(|\)|-/).some(part => part.startsWith(clean)));

                    let score = 0;
                    if (exact) score = 3;
                    else if (starts) score = 2;
                    else if (clean.length >= 2 && wordStarts) score = 1;

                    return { country, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score || a.country.name.localeCompare(b.country.name))
                .map(item => item.country);
        }

        results.innerHTML = "";

        if (!matches.length) {
            const empty = document.createElement("div");
            empty.className = "schedule-no-results";
            empty.textContent = "No encontré ese país.";
            results.appendChild(empty);
            return;
        }

        matches.slice(0, 8).forEach(country => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "schedule-country-option";
            button.textContent = `${country.flag} ${country.name}`;
            button.onclick = () => {
                selectedScheduleCountry = country;
                showCountryTime(country);
            };
            results.appendChild(button);
        });
    }

    function showCountryTime(country) {
        const output = document.getElementById("selectedCountryTime");
        const search = document.getElementById("countryScheduleSearch");
        if (!output || !country) return;

        const time = currentScheduleMode === "pc" ? country.pc : country.phone;
        const modeText = currentScheduleMode === "pc" ? "Stream en PC" : "Stream en Phone";

        if (search) search.value = country.name;

        output.innerHTML = `
            <strong>${country.flag} ${country.name}</strong>
            ${modeText}: <span>${time}</span>
        `;
    }

    function getFlagListLabel(country) {
        if (country.key === "usa-la") return `${country.flag} Los Ángeles`;
        if (country.key === "usa-texas") return `${country.flag} Texas`;
        if (country.key === "usa-ny") return `${country.flag} New York`;
        return country.flag;
    }

    function renderFlagLists() {
        const latam = document.getElementById("latamFlagList");
        const world = document.getElementById("worldFlagList");

        if (latam) {
            latam.innerHTML = nicoticCountries
                .filter(country => country.group === "latam")
                .map(country => `<span class="flag-list-pill" title="${country.name}">${getFlagListLabel(country)}</span>`)
                .join("");
        }

        if (world) {
            world.innerHTML = nicoticCountries
                .filter(country => country.group === "world")
                .map(country => `<span class="flag-list-pill" title="${country.name}">${getFlagListLabel(country)}</span>`)
                .join("");
        }
    }

    const VIEWER_COUNTRY_STATE_KEY = "nicotic_viewer_country_state_v2";
    const VIEWER_COUNTRY_MAX_CHANGES = 2;

    function loadViewerCountryState() {
        const oldKey = localStorage.getItem("nicotic_viewer_country_voted_v1");

        const saved = localStorage.getItem(VIEWER_COUNTRY_STATE_KEY);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    selectedKey: parsed.selectedKey || oldKey || "",
                    changeCount: Number(parsed.changeCount || 0),
                    locked: parsed.locked === true
                };
            } catch (e) {}
        }

        return {
            selectedKey: oldKey || "",
            changeCount: 0,
            locked: false
        };
    }

    function saveViewerCountryState(viewerState) {
        localStorage.setItem(VIEWER_COUNTRY_STATE_KEY, JSON.stringify(viewerState));

        if (viewerState.selectedKey) {
            localStorage.setItem("nicotic_viewer_country_voted_v1", viewerState.selectedKey);
        } else {
            localStorage.removeItem("nicotic_viewer_country_voted_v1");
        }
    }

    function renderViewerFlags() {
        const latam = document.getElementById("latamViewerFlags");
        const world = document.getElementById("worldViewerFlags");
        const viewerState = loadViewerCountryState();

        if (latam) latam.innerHTML = "";
        if (world) world.innerHTML = "";

        nicoticCountries.forEach(country => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "viewer-flag-button";
            button.dataset.countryKey = country.key;
            button.innerHTML = `
                <span class="viewer-flag-name">
                    <span>${country.flag}</span>
                    <span class="viewer-flag-country">${country.name}</span>
                </span>
                <span class="viewer-flag-count" id="viewerCount_${country.key}">+0</span>
            `;
            button.onclick = () => voteViewerCountry(country.key);

            if (viewerState.selectedKey === country.key) {
                button.classList.add("voted");
            }

            if (viewerState.locked && viewerState.selectedKey !== country.key) {
                button.classList.add("locked");
            }

            if (country.group === "latam" && latam) latam.appendChild(button);
            if (country.group === "world" && world) world.appendChild(button);
        });
    }

    function listenViewerCountryVotes() {
        if (!window.nicoticDb) return;

        window.nicoticDb.ref("portal/viewerCountries").on("value", snapshot => {
            const values = snapshot.val() || {};

            nicoticCountries.forEach(country => {
                const countEl = document.getElementById(`viewerCount_${country.key}`);
                const count = Number(values[country.key] || 0);
                if (countEl) countEl.textContent = `+${count}`;
            });
        });
    }

    function updateViewerFlagSelection(selectedKey, locked) {
        document.querySelectorAll(".viewer-flag-button").forEach(button => {
            const isSelected = button.dataset.countryKey === selectedKey;
            button.classList.toggle("voted", isSelected);
            button.classList.toggle("locked", Boolean(locked && !isSelected));
        });
    }

    function bumpViewerCountry(countryKey, amount) {
        if (!countryKey) return;

        if (!window.nicoticDb) {
            const countEl = document.getElementById(`viewerCount_${countryKey}`);
            if (countEl) {
                const current = Number(countEl.textContent.replace("+", "")) || 0;
                countEl.textContent = `+${Math.max(0, current + amount)}`;
            }
            return;
        }

        window.nicoticDb.ref(`portal/viewerCountries/${countryKey}`).transaction(current => {
            return Math.max(0, (Number(current) || 0) + amount);
        });
    }

    function voteViewerCountry(countryKey) {
        const viewerState = loadViewerCountryState();

        if (viewerState.locked) {
            updateViewerFlagSelection(viewerState.selectedKey, true);
            return;
        }

        if (!viewerState.selectedKey) {
            viewerState.selectedKey = countryKey;
            if (viewerState.changeCount >= VIEWER_COUNTRY_MAX_CHANGES) {
                viewerState.locked = true;
            }
            saveViewerCountryState(viewerState);
            updateViewerFlagSelection(viewerState.selectedKey, viewerState.locked);
            bumpViewerCountry(countryKey, 1);
            return;
        }

        if (viewerState.selectedKey === countryKey) {
            if (viewerState.changeCount + 1 >= VIEWER_COUNTRY_MAX_CHANGES) {
                viewerState.locked = true;
                saveViewerCountryState(viewerState);
                updateViewerFlagSelection(viewerState.selectedKey, true);
                return;
            }

            bumpViewerCountry(countryKey, -1);
            viewerState.selectedKey = "";
            viewerState.changeCount += 1;
            saveViewerCountryState(viewerState);
            updateViewerFlagSelection("", false);
            return;
        }

        if (viewerState.changeCount >= VIEWER_COUNTRY_MAX_CHANGES) {
            viewerState.locked = true;
            saveViewerCountryState(viewerState);
            updateViewerFlagSelection(viewerState.selectedKey, true);
            return;
        }

        const oldKey = viewerState.selectedKey;
        bumpViewerCountry(oldKey, -1);
        bumpViewerCountry(countryKey, 1);

        viewerState.selectedKey = countryKey;
        viewerState.changeCount += 1;

        if (viewerState.changeCount >= VIEWER_COUNTRY_MAX_CHANGES) {
            viewerState.locked = true;
        }

        saveViewerCountryState(viewerState);
        updateViewerFlagSelection(viewerState.selectedKey, viewerState.locked);
    }




    
    /* =========================
       DESPLEGAR COMENTARIOS
    ========================= */
    function initCommentsToggle() {
        const toggle = document.getElementById("toggleCommentsBox");
        const box = document.querySelector(".comments-box");

        if (!toggle || !box) return;

        box.classList.add("comments-collapsed");
        toggle.textContent = "Desplegar comentarios";

        toggle.onclick = () => {
            const isClosed = box.classList.toggle("comments-collapsed");
            toggle.textContent = isClosed ? "Desplegar comentarios" : "Ocultar comentarios";
        };
    }

    /* =========================
       PANEL FLOTANTE DE REDES
    ========================= */
    function initSocialDrawer() {
        const openBtn = document.getElementById("socialFloatButton");
        const drawer = document.getElementById("socialSection");
        const closeBtn = document.getElementById("socialDrawerClose");

        if (!drawer) return;

        function openSocial() {
            drawer.classList.add("open");
            drawer.setAttribute("aria-hidden", "false");
        }

        function closeSocial() {
            drawer.classList.remove("open");
            drawer.setAttribute("aria-hidden", "true");
        }

        if (openBtn) openBtn.onclick = openSocial;
        if (closeBtn) closeBtn.onclick = closeSocial;

        drawer.querySelectorAll("[data-close-social]").forEach(el => {
            el.addEventListener("click", closeSocial);
        });

        window.openNicoticSocial = openSocial;
    }


    /* =========================
       MENÚ SUPERIOR DESPLEGABLE
    ========================= */
    function initSideMenu() {
        const menuButton = document.querySelector(".menu-icon");
        const menu = document.getElementById("sideMenu");
        const closeButton = document.getElementById("sideMenuClose");

        if (!menuButton || !menu) return;

        function openMenu() {
            menu.classList.add("open");
            menu.setAttribute("aria-hidden", "false");
        }

        function closeMenu() {
            menu.classList.remove("open");
            menu.setAttribute("aria-hidden", "true");
        }

        menuButton.addEventListener("click", openMenu);
        if (closeButton) closeButton.addEventListener("click", closeMenu);

        menu.addEventListener("click", (event) => {
            if (event.target === menu) closeMenu();
        });

        document.querySelectorAll(".side-menu-link").forEach(button => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;

                if (button.dataset.socialOpen === "true" && typeof window.openNicoticSocial === "function") {
                    closeMenu();
                    setTimeout(() => window.openNicoticSocial(), 120);
                    return;
                }

                const target = document.getElementById(targetId);

                if (target) {
                    closeMenu();
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 120);
                }
            });
        });
    }


    /* =========================
       INICIAR TODO
    ========================= */
    initSideMenu();
    initSocialDrawer();
    initCommentsToggle();
    initializeVideos();
    initNoticesCarousel();
    initFeaturedEvent();
    initNewEpisodeAlert();
    initStreamAlert();
    initFloatingMusic();
    initScheduleTools();
    countPortalVisit();
    initVisualEffects();

});
