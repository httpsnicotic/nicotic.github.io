document.addEventListener("DOMContentLoaded", async () => {
    await tsParticles.load("tsparticles", {
        fullScreen: { enable: true },
        background: {
            color: "#000"
        },
        particles: {
            number: {
                value: 60
            },
            color: {
                value: "#ffffff"
            },
            shape: {
                type: "circle"
            },
            opacity: {
                value: 0.5
            },
            size: {
                value: 3
            },
            move: {
                enable: true,
                speed: 2
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
