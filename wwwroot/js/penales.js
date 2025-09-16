// =====================
// Variables globales
// =====================
let salaActual = "";
let owner = false;
let nombreUsuario = "";
let connection = new signalR.HubConnectionBuilder()
    .withUrl("/penalesHub")
    .build();

let turnoActual = null;

// =====================
// Funciones globales (scope global para onclick)
// =====================
async function crearSala() {
    const input = document.getElementById("txtNombreCrear");
    nombreUsuario = input.value.trim();
    if (!nombreUsuario) { alert("Ingresa tu nombre"); return; }

    salaActual = Math.random().toString(36).substring(2, 6).toUpperCase();
    owner = true;

    await connection.invoke("CrearSala", salaActual, nombreUsuario);

    document.getElementById("codigoSala").innerText = salaActual;
    document.getElementById("popupSala").style.display = "block";
    document.getElementById("btnIniciar").style.display = "block";
}

async function unirseSala() {
    const inputNombre = document.getElementById("txtNombreUnirse");
    const inputCodigo = document.getElementById("txtCodigoUnirse");
    nombreUsuario = inputNombre.value.trim();
    salaActual = inputCodigo.value.trim().toUpperCase();
    owner = false;

    if (!nombreUsuario || !salaActual) { alert("Completa todos los datos"); return; }

    await connection.invoke("UnirseSala", salaActual, nombreUsuario);

    document.getElementById("codigoSala").innerText = salaActual;
    document.getElementById("popupSala").style.display = "block";
}

async function iniciarPartida() {
    if (!salaActual) return;
    await connection.invoke("IniciarPartida", salaActual);
}

// =====================
// Conexión SignalR
// =====================
connection.on("ActualizarEquipos", (equipo1, arquero1, equipo2, arquero2) => {
    const e1 = document.getElementById("equipo1");
    const e2 = document.getElementById("equipo2");
    const a1 = document.getElementById("arqueroEquipo1");
    const a2 = document.getElementById("arqueroEquipo2");

    e1.innerHTML = "";
    e2.innerHTML = "";
    equipo1.forEach(j => e1.innerHTML += `<li>${j} ${j === arquero1 ? "🧤(Arquero)" : ""}</li>`);
    equipo2.forEach(j => e2.innerHTML += `<li>${j} ${j === arquero2 ? "🧤(Arquero)" : ""}</li>`);
    a1.innerText = `Arquero: ${arquero1} 🧤`;
    a2.innerText = `Arquero: ${arquero2} 🧤`;
});

connection.on("PartidaIniciada", () => {
    // Ocultar seccion de equipos y boton
    document.getElementById("seccionEquipos").style.display = "none";
    // Mostrar seccion de juego
    document.getElementById("seccionJuego").style.display = "block";
    generarGrid();
});

connection.on("NuevoTurno", (pateador, arquero, equipo) => {
    turnoActual = { pateador, arquero };
    const info = document.getElementById("turnoInfo");
    if (nombreUsuario === pateador) {
        info.innerText = `¡Tu turno de patear! - Arquero: ${arquero}`;
    } else if (nombreUsuario === arquero) {
        info.innerText = `¡Tu turno de atajar! - Pateador: ${pateador}`;
    } else {
        info.innerText = `Turno: ${pateador} patea, ${arquero} ataja`;
    }
    actualizarGridEstado();
});

connection.on("ResultadoTurno", (pateador, arquero, gol, marcador) => {
    alert(gol ? "¡Gol!" : "Atajado!");
    actualizarMarcador(marcador);
});

connection.on("FinTanda", (marcador) => {
    alert("¡Tanda finalizada!");
    actualizarMarcador(marcador);
});

// =====================
// Funciones de juego
// =====================
function generarGrid() {
    const grid = document.getElementById("arcoGrid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = "repeat(3, 140px)";
    grid.style.gridTemplateRows = "repeat(3, 40px)";
    grid.style.justifyContent = "center";
    grid.style.alignContent = "center";

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const btn = document.createElement("button");
            btn.style.width = "140px";
            btn.style.height = "40px";
            btn.style.fontSize = "18px";
            btn.style.fontWeight = "bold";
            btn.style.borderRadius = "8px";
            btn.style.cursor = "pointer";
            btn.style.backgroundColor = "rgba(255,255,255,0.6)";
            btn.onclick = () => seleccionarCelda(r, c);
            grid.appendChild(btn);
        }
    }
}

function actualizarGridEstado() {
    const grid = document.getElementById("arcoGrid");
    Array.from(grid.children).forEach(btn => {
        btn.disabled = !(nombreUsuario === turnoActual.pateador || nombreUsuario === turnoActual.arquero);
    });
}

function seleccionarCelda(fila, col) {
    if (!turnoActual) return;
    connection.invoke("SeleccionarCelda", salaActual, nombreUsuario, fila, col);
}

function actualizarMarcador(marcador) {
    const div = document.getElementById("marcador");
    div.innerHTML = `
        Equipo 1: ${marcador.Equipo1.join("")} <br/>
        Equipo 2: ${marcador.Equipo2.join("")}
    `;
}

// =====================
// Conexión
// =====================
connection.start()
    .then(() => console.log("Conectado al hub"))
    .catch(err => console.error(err));
