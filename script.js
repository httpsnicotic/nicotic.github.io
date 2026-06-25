document.addEventListener("DOMContentLoaded", () => {

    tsParticles.load("tsparticles", {
        fullScreen: { enable: true },

        background: {
            color: "transparent"
        },

        // 🔥 LIMITE DE SEGURIDAD (evita saturación)
        detectRetina: true,
        fpsLimit: 60,

        interactivity: {
            detectsOn: "window",

            events: {
                onHover: {
                    enable: true,
                    mode: "repulse"
                },

                onClick: {
                    enable: true,
                    mode: "push"
                },

                onTouch: {
                    enable: true,
                    mode: "repulse"
                },

                resize: true
            },

            modes: {
                repulse: {
                    distance: 140,
                    duration: 0.4
                },

                push: {
                    quantity: 2 // 🔥 LIMITA CREACIÓN DE PARTICULAS
                }
            }
        },

        particles: {
            number: {
                value: 45, // 🔥 BAJADO PARA EVITAR LAG
                density: {
                    enable: true,
                    area: 900
                }
            },

            color: {
                value: "#8a2be2"
            },

            shape: {
                type: "circle"
            },

            opacity: {
                value: 0.65
            },

            size: {
                value: 6,
                random: {
                    enable: true,
                    minimumValue: 3
                }
            },

            move: {
                enable: true,
                speed: 1.3,
                random: true,
                direction: "none",
                straight: false,
                outModes: {
                    default: "out"
                }
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

    // 🔘 BOTÓN SEGURO
    const boton = document.getElementById("enterBtn");

    if (boton) {
        boton.addEventListener("click", () => {
            window.location.href = "portal.html";
        });
    }
});
