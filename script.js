document.addEventListener("DOMContentLoaded", () => {
    tsParticles.load("tsparticles", {
        fullScreen: { enable: true },

        background: {
            color: "transparent"
        },

        particles: {
            number: {
                value: 90,
                density: {
                    enable: true,
                    area: 800
                }
            },

            color: {
                value: "#8a2be2"
            },

            shape: {
                type: "circle"
            },

            opacity: {
                value: 0.4
            },

            size: {
                value: { min: 1, max: 3 }
            },

            move: {
                enable: true,
                speed: 1.2,
                outModes: {
                    default: "out"
                }
            },

            links: {
                enable: true,
                color: "#8a2be2",
                distance: 150,
                opacity: 0.25,
                width: 1
            }
        }
    });

    const boton = document.getElementById("enterBtn");

    if (boton) {
        boton.addEventListener("click", () => {
            window.location.href = "portal.html";
        });
    }
});
