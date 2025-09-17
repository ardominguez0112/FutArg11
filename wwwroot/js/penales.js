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
    const error = document.getElementById("errorNombreCrear");
    nombreUsuario = input.value.trim();

    if (!nombreUsuario) {
        error.innerText = "Ingresa tu nombre";
        error.style.display = "block";
        return;
    }
    error.style.display = "none";

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
    const errorNombre = document.getElementById("errorNombreUnirse");
    const errorCodigo = document.getElementById("errorCodigoUnirse");

    nombreUsuario = inputNombre.value.trim();
    salaActual = inputCodigo.value.trim().toUpperCase();

    let hasError = false;

    if (!nombreUsuario) {
        errorNombre.innerText = "Ingresa tu nombre";
        errorNombre.style.display = "block";
        hasError = true;
    } else {
        errorNombre.style.display = "none";
    }

    if (!salaActual) {
        errorCodigo.innerText = "Ingresa el código de sala";
        errorCodigo.style.display = "block";
        hasError = true;
    } else {
        errorCodigo.style.display = "none";
    }

    if (hasError) return;

    await connection.invoke("UnirseSala", salaActual, nombreUsuario);

    document.getElementById("codigoSala").innerText = salaActual;
    document.getElementById("popupSala").style.display = "block";
    document.getElementById("btnIniciar").style.display = "block";
    document.getElementById("btnIniciar").disabled = true;
    document.getElementById("btnIniciar").tooltip = "Solo el líder puede iniciar la partida";
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
    equipo1.forEach(j => e1.innerHTML += `<li>${j} ${j === arquero1 ? "🧤" : "👟"}</li>`);
    equipo2.forEach(j => e2.innerHTML += `<li>${j} ${j === arquero2 ? "🧤" : "👟"}</li>`);
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
    const btnAccion = document.getElementById("btnAccionTurno");

    if (nombreUsuario === pateador) {
        info.innerText = `¡Tu turno de patear! - Arquero: ${arquero}`;
        btnAccion.innerText = "Patear";
        btnAccion.disabled = true; // hasta que seleccione celda
        btnAccion.style.display = "inline-block";
    } else if (nombreUsuario === arquero) {
        info.innerText = `¡Tu turno de atajar! - Pateador: ${pateador}`;
        btnAccion.innerText = "Atajar";
        btnAccion.disabled = true; // hasta que seleccione celda
        btnAccion.style.display = "inline-block";
    } else {
        info.innerText = `Turno: ${pateador} patea, ${arquero} ataja`;
        btnAccion.style.display = "none";
    }

    actualizarGridEstado();
});

connection.on("ResultadoTurno", (pateador, arquero, gol, marcador, filaP, colP, filaA, colA) => {
    actualizarMarcador(marcador);
    mostrarNotificacionTurno(gol ? "¡GOL!" : "Atajado!", gol);

    const grid = document.getElementById("arcoGrid");
    const botones = grid.querySelectorAll("button");

    // Limpiar overlays previos
    botones.forEach(btn => {
        btn.style.backgroundImage = "";
        btn.style.backgroundColor = "rgba(255,255,255,0.6)";
        const overlays = btn.querySelectorAll(".overlayResultado");
        overlays.forEach(o => o.remove());
    });

    // Pateador
    if (filaP != null && colP != null) {
        const btnP = botones[filaP * 3 + colP];
        btnP.style.backgroundColor = "rgba(0,200,0,0.4)"; // fondo verde
        const overlayP = document.createElement("div");
        overlayP.className = "overlayResultado";
        overlayP.style.backgroundImage = "url('/images/pelota.png')";
        overlayP.style.backgroundSize = "contain";
        overlayP.style.backgroundRepeat = "no-repeat";
        overlayP.style.backgroundPosition = "center";
        overlayP.style.width = "100%";
        overlayP.style.height = "100%";
        overlayP.style.pointerEvents = "none";
        overlayP.style.zIndex = 1;
        btnP.appendChild(overlayP);
    }

    // Arquero
    if (filaA != null && colA != null) {
        const btnA = botones[filaA * 3 + colA];
        btnA.style.backgroundColor = "rgba(200,0,0,0.4)"; // fondo rojo
        const overlayA = document.createElement("div");
        overlayA.className = "overlayResultado";
        overlayA.style.backgroundImage = "url('/images/guante.png')";
        overlayA.style.backgroundSize = "contain";
        overlayA.style.backgroundRepeat = "no-repeat";
        overlayA.style.backgroundPosition = "center";
        overlayA.style.width = "100%";
        overlayA.style.height = "100%";
        overlayA.style.pointerEvents = "none";
        overlayA.style.zIndex = 2;
        btnA.appendChild(overlayA);
    }

    // Limpiar celda seleccionada temporal
    celdaSeleccionada = null;

    // Quitar overlays cuando desaparece la notificación
    setTimeout(() => {
        botones.forEach(btn => {
            const overlays = btn.querySelectorAll(".overlayResultado");
            overlays.forEach(o => o.remove());
            btn.style.backgroundColor = "rgba(255,255,255,0.6)";
        });
    }, 1500); // mismo tiempo que la notificación
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
    const arcoGrid = document.getElementById("arcoGrid");
    const turnoInfo = document.getElementById("turnoInfo");
    const btnAccion = document.getElementById("btnAccionTurno"); // tu botón Patear/Atajar

    // Ocultar arco, info del turno y botón de acción
    arcoGrid.style.display = "none";
    turnoInfo.style.display = "none";
    btnAccion.style.display = "none";

    // Mostrar mensaje de ganador
    mensaje.textContent = `🏆 Ganoooo el ${ganador}`;
    divResultado.style.display = "block";

    // Botón revancha
    btnRevancha.style.display = "inline-block";
    btnRevancha.disabled = !owner;
    btnRevancha.tooltip = owner ? "" : "Solo el líder puede reiniciar la partida";

    // Volver al lobby
    document.getElementById("btnVolverLobby").onclick = () => {
        window.location.href = "/Penales"; // ajustá la ruta si es distinta
    };

    btnRevancha.onclick = async () => {
        divResultado.style.display = "none";
        await reiniciarSala();
    };
}

function mostrarNotificacionTurno(texto, gol) {
    const div = document.getElementById("notificacionTurno");
    div.innerText = texto;
    div.style.backgroundColor = gol ? "rgba(0, 200, 0, 0.85)" : "rgba(200, 0, 0, 0.85)";
    div.classList.add("mostrar");

    // Desaparece después de 1.5s
    setTimeout(() => {
        div.classList.remove("mostrar");
    }, 1500);
}

// =====================
// Funciones de juego
// =====================
function generarGrid() {
    const grid = document.getElementById("arcoGrid");
    grid.innerHTML = "";
    grid.classList.add("arco-grid"); // que tome los estilos de arriba

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const btn = document.createElement("button");
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

    // Limpiar selección anterior
    if (celdaSeleccionada !== null) {
        botones[celdaSeleccionada].style.backgroundImage = "";
        botones[celdaSeleccionada].style.backgroundColor = "rgba(255,255,255,0.6)";
    }

    celdaSeleccionada = index;

    // Mostrar la selección temporal
    if (nombreUsuario === turnoActual.pateador) {
        botones[index].style.backgroundImage = "url('/images/pelota.png')";
    } else if (nombreUsuario === turnoActual.arquero) {
        botones[index].style.backgroundImage = "url('/images/guante.png')";
    }

    botones[index].style.backgroundSize = "contain";
    botones[index].style.backgroundRepeat = "no-repeat";
    botones[index].style.backgroundPosition = "center";
    botones[index].style.backgroundColor = "transparent";

    // Habilitar botón de acción
    const btnAccion = document.getElementById("btnAccionTurno");
    btnAccion.disabled = false;
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
// Botón Patear/Atajar
// =====================
document.getElementById("btnAccionTurno").onclick = async () => {
    if (celdaSeleccionada === null) return;

    const fila = Math.floor(celdaSeleccionada / 3);
    const col = celdaSeleccionada % 3;

    await connection.invoke("SeleccionarCelda", salaActual, nombreUsuario, fila, col);

    // Deshabilitar botón hasta próximo turno
    document.getElementById("btnAccionTurno").disabled = true;
};


// =====================
// Conexión
// =====================
connection.start()
    .then(() => console.log("Conectado al hub"))
    .catch(err => console.error(err));
