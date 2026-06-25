document.addEventListener("DOMContentLoaded", () => {

    tsParticles.load("tsparticles", {
        fullScreen: { enable: true },

        background: {
            color: "transparent"
        },

        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse"
                },
                onClick: {
                    enable: true,
                    mode: "push"
                },
                resize: true
            },

            modes: {
                repulse: {
                    distance: 120,
                    duration: 0.4
                },
                push: {
                    quantity: 4
                }
            }
        },

        particles: {
            number: {
                value: 60,
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
                value: 0.7
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
                speed: 1.5,
                direction: "none",
                random: true,
                straight: false,
                outModes: {
                    default: "out"
                }
            },

            links: {
                enable: true,
                color: "#8a2be2",
                distance: 140,
                opacity: 0.35,
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
