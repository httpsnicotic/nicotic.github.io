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
       AVISO RÁPIDO: HOY ESTARÉ EN...
       Firebase: portal/alerts/locationAlert
    ========================= */
    let locationAlertTimer = null;

    const locationAlertDemo = {
        active: false,
        title: "Hoy estaré en Trujillo",
        place: "Centro de Trujillo",
        description: "Estaré grabando algo especial para el sótano.",
        dateTime: "2026-07-10T17:00:00-05:00",
        imageUrl: "ojo.jpg",
        videoUrl: "",
        buttonText: "Más info",
        buttonUrl: "",
        expireAfterHours: 6
    };

    function initLocationAlert() {
        const section = document.getElementById("locationAlertSection");

        if (!section) return;

        hideLocationAlert();

        if (window.nicoticDb) {
            window.nicoticDb.ref("portal/alerts/locationAlert").on("value", snapshot => {
                const data = snapshot.val();

                if (!data || data.active !== true) {
                    hideLocationAlert();
                    return;
                }

                renderLocationAlert(data);
            }, error => {
                console.warn("NICOTIC: no se pudo leer locationAlert.", error);
                renderLocationAlert(locationAlertDemo);
            });

            return;
        }

        renderLocationAlert(locationAlertDemo);
    }

    function renderLocationAlert(data) {
        const section = document.getElementById("locationAlertSection");
        const title = document.getElementById("locationAlertTitle");
        const place = document.getElementById("locationAlertPlace");
        const description = document.getElementById("locationAlertDescription");
        const media = document.getElementById("locationAlertMedia");
        const button = document.getElementById("locationAlertButton");
        const toggle = document.getElementById("locationAlertToggle");

        if (!section) return;

        if (!data || data.active !== true) {
            hideLocationAlert();
            return;
        }

        if (title) title.textContent = data.title || "Hoy estaré en...";
        if (place) place.textContent = data.place || "Lugar por confirmar";
        if (description) description.textContent = data.description || "Pronto habrá un aviso especial.";

        renderLocationAlertMedia(media, data);
        setupLocationAlertToggle(section, toggle);
        renderLocationAlertButton(button, data);

        section.classList.remove("nicotic-alert-hidden");
        startLocationAlertCountdown(data);
    }


    function setupLocationAlertToggle(section, toggle) {
        if (!section || !toggle) return;

        section.classList.remove("location-alert-expanded");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = 'Ver foto completa <span>⌄</span>';

        toggle.onclick = () => {
            const expanded = section.classList.toggle("location-alert-expanded");
            toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
            toggle.innerHTML = expanded ? 'Ocultar foto <span>⌃</span>' : 'Ver foto completa <span>⌄</span>';
        };
    }

    function renderLocationAlertMedia(media, data) {
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
            img.alt = data.title || "Aviso NICOTIC";
            img.loading = "lazy";
            media.appendChild(img);
        }
    }

    function renderLocationAlertButton(button, data) {
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

    function startLocationAlertCountdown(data) {
        clearInterval(locationAlertTimer);

        updateLocationAlertCountdown(data);

        locationAlertTimer = setInterval(() => {
            updateLocationAlertCountdown(data);
        }, 1000);
    }

    function updateLocationAlertCountdown(data) {
        const section = document.getElementById("locationAlertSection");
        const countdown = document.getElementById("locationAlertCountdown");

        if (!section || !countdown) return;

        const target = new Date(data.dateTime || "").getTime();

        if (!target || Number.isNaN(target)) {
            countdown.textContent = "Fecha por confirmar";
            section.classList.remove("location-alert-ended");
            return;
        }

        const now = Date.now();
        const diff = target - now;
        const expireAfterHours = Number(data.expireAfterHours || 6);
        const hideAfterMs = expireAfterHours * 60 * 60 * 1000;

        if (diff <= 0) {
            const passed = Math.abs(diff);

            if (passed >= hideAfterMs) {
                hideLocationAlert();
                return;
            }

            countdown.textContent = data.startedText || "Ya comenzó";
            section.classList.add("location-alert-ended");
            return;
        }

        section.classList.remove("location-alert-ended");

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            countdown.textContent = `${days}d ${padTime(hours)}h ${padTime(minutes)}m`;
        } else {
            countdown.textContent = `${padTime(hours)}h ${padTime(minutes)}m ${padTime(seconds)}s`;
        }
    }

    function hideLocationAlert() {
        const section = document.getElementById("locationAlertSection");

        if (section) {
            section.classList.add("nicotic-alert-hidden");
            section.classList.remove("location-alert-ended");
        }

        clearInterval(locationAlertTimer);
    }

    function padTime(value) {
        return String(value).padStart(2, "0");
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
       INICIAR TODO
    ========================= */
    initializeVideos();
    initLocationAlert();
    initFeaturedEvent();
    initNewEpisodeAlert();
    initStreamAlert();
    initFloatingMusic();
    countPortalVisit();
    initVisualEffects();

});
