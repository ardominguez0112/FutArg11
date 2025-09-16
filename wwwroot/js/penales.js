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

let celdaSeleccionada = null;

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
    document.getElementById("btnIniciar").disabled = false;
    document.getElementById("btnIniciar").title = "";
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
    document.getElementById("btnIniciar").style.display = "block"; // Mostrar aunque no sea owner
    document.getElementById("btnIniciar").disabled = true; // Deshabilitar si no es owner
    document.getElementById("btnIniciar").title = "Solo el líder puede iniciar la partida";
}

async function iniciarPartida() {
    if (!salaActual) return;
    await connection.invoke("IniciarPartida", salaActual);
}

async function reiniciarSala() {
    if (!salaActual) return;
    await connection.invoke("ReiniciarSala", salaActual);
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
    equipo1.forEach(j => e1.innerHTML += `<li>${j} ${j === arquero1 ? "(Arquero)🧤" : ""}</li>`);
    equipo2.forEach(j => e2.innerHTML += `<li>${j} ${j === arquero2 ? " (Arquero)🧤": ""}</li>`);
    a1.innerText = `Arquero: ${arquero1} 🧤`;
    a2.innerText = `Arquero: ${arquero2} 🧤`;
});

connection.on("PartidaIniciada", () => {
    // Ocultar seccion de equipos y boton
    document.getElementById("seccionEquipos").style.display = "none";
    // Mostrar seccion de juego
    document.getElementById("seccionJuego").style.display = "block";
    generarGrid();
    inicializarMarcador();
});

connection.on("NuevoTurno", (pateador, arquero, equipo) => {
    turnoActual = { pateador, arquero };
    const info = document.getElementById("turnoInfo");
    if (nombreUsuario === pateador) {
        info.innerText = `¡Tu turno de patear! - Arquero: ${arquero} 🧤`;
    } else if (nombreUsuario === arquero) {
        info.innerText = `¡Tu turno de atajar 🧤! - Pateador: ${pateador}`;
    } else {
        info.innerText = `Turno: ${pateador} patea, ${arquero} ataja 🧤`;
    }
    actualizarGridEstado();
});

connection.on("ResultadoTurno", (pateador, arquero, gol, marcador) => {
    alert(gol ? "¡Gol!" : "Atajado!");
    actualizarMarcador(marcador);
    if (celdaSeleccionada !== null) {
        const grid = document.getElementById("arcoGrid");
        const botones = grid.querySelectorAll("button");
        const btn = botones[celdaSeleccionada];

        btn.style.backgroundImage = "";
        btn.style.backgroundColor = "rgba(255,255,255,0.6)";
        btn.style.outline = "none";
        btn.disabled = false;

        celdaSeleccionada = null;
    }
});

connection.on("FinTanda", (marcador, ganador) => {
    actualizarMarcador(marcador);
    mostrarResultado(ganador);
});

connection.on("VolverAlLobby", () => {
    document.getElementById("resultadoTanda").style.display = "none";
    document.getElementById("seccionJuego").style.display = "none";

    document.getElementById("seccionEquipos").style.display = "block";
    document.getElementById("btnIniciar").style.display = owner ? "block" : "none";
});

// =====================
// Función para mostrar resultado
// =====================
function mostrarResultado(ganador) {
    const divResultado = document.getElementById("resultadoTanda");
    const mensaje = document.getElementById("mensajeGanador");
    const btnRevancha = document.getElementById("btnRevancha");

    mensaje.textContent = `🏆 Ganoooo el ${ganador}`;
    divResultado.style.display = "block";

    btnRevancha.style.display = "inline-block";
    btnRevancha.disabled = !owner;
    btnRevancha.title = owner ? "" : "Solo el líder puede reiniciar la partida";

    document.getElementById("btnVolverLobby").onclick = () => {
        window.location.href = "/Penales"; // ajustá la ruta si es distinta
    };

    btnRevancha.onclick = async () => {
        divResultado.style.display = "none";
        await reiniciarSala();
    };
}

// =====================
// Funciones de juego
// =====================
function generarGrid() {
    const grid = document.getElementById("arcoGrid");
    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(3, 8rem)`;
    grid.style.gridTemplateRows = `repeat(3, 2.5rem)`;
    grid.style.gap = `0.3rem`;
    grid.style.justifyContent = "center";
    grid.style.alignContent = "center";

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const btn = document.createElement("button");
            btn.style.width = "8rem";
            btn.style.height = "2.5rem";
            btn.style.fontSize = "1.2rem";
            btn.style.borderRadius = "0.5rem";
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

    const grid = document.getElementById("arcoGrid");
    const index = fila * 3 + col;
    const botones = grid.querySelectorAll("button");

    // Si había una celda previa, la limpio
    if (celdaSeleccionada !== null) {
        botones[celdaSeleccionada].style.backgroundImage = "";
        botones[celdaSeleccionada].style.backgroundColor = "rgba(255,255,255,0.6)";
    }

    celdaSeleccionada = index;

    // Si soy pateador → pelota, si soy arquero → guantes
    if (nombreUsuario === turnoActual.pateador) {
        botones[index].style.backgroundImage = "url('/images/pelota.png')";
    } else if (nombreUsuario === turnoActual.arquero) {
        botones[index].style.backgroundImage = "url('/images/guante.png')";
    }

    botones[index].style.backgroundSize = "contain";
    botones[index].style.backgroundRepeat = "no-repeat";
    botones[index].style.backgroundPosition = "center";
    botones[index].style.backgroundColor = "transparent";

    connection.invoke("SeleccionarCelda", salaActual, nombreUsuario, fila, col);
}

function actualizarMarcador(marcador) {
    const eq1 = document.getElementById("marcadorEquipo1");
    const eq2 = document.getElementById("marcadorEquipo2");

    // Si hay más de 5 tiros (muerte súbita), agregar casillas extra
    while (eq1.children.length < marcador.Equipo1.length) {
        eq1.appendChild(crearCasillaPenal());
    }
    while (eq2.children.length < marcador.Equipo2.length) {
        eq2.appendChild(crearCasillaPenal());
    }

    // Llenar casillas
    marcador.Equipo1.forEach((valor, i) => eq1.children[i].innerText = valor);
    marcador.Equipo2.forEach((valor, i) => eq2.children[i].innerText = valor);
}

function inicializarMarcador() {
    const eq1 = document.getElementById("marcadorEquipo1");
    const eq2 = document.getElementById("marcadorEquipo2");

    eq1.innerHTML = "";
    eq2.innerHTML = "";

    // Empieza con 5 casillas cada equipo
    for (let i = 0; i < 5; i++) {
        eq1.appendChild(crearCasillaPenal());
        eq2.appendChild(crearCasillaPenal());
    }
}

function crearCasillaPenal() {
    const div = document.createElement("div");
    div.className = "penal";
    div.style.width = "2rem";
    div.style.height = "2rem";
    div.style.border = "2px solid #333";
    div.style.borderRadius = "50%";
    div.style.backgroundColor = "#e0e0e0";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.fontSize = "1.2rem";
    div.style.fontWeight = "bold";
    div.style.color = "#333";
    div.style.transition = "transform 0.2s, background-color 0.3s";
    div.innerText = ""; // vacío al inicio
    return div;
}

// =====================
// Conexión
// =====================
connection.start()
    .then(() => console.log("Conectado al hub"))
    .catch(err => console.error(err));
