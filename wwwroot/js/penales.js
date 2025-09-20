// =====================
// Variables globales
// =====================
let salaActual = "";
let objetoSala = null;
let owner = false;
let nombreUsuario = "";
let connection = new signalR.HubConnectionBuilder()
    .withUrl("/penalesHub", {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .configureLogging(signalR.LogLevel.Information)
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
    await ensureConnection();
    await connection.invoke("IniciarPartida", salaActual);
}

async function reiniciarSala() {
    if (!salaActual) return;
    await ensureConnection();
    await connection.invoke("ReiniciarSala", salaActual);
}

// =====================
// Conexión SignalR
// =====================
connection.on("ActualizarEquipos", (equipo1, arquero1, capitan1, equipo2, arquero2, capitan2) => {
    const e1 = document.getElementById("equipo1");
    const e2 = document.getElementById("equipo2");
    const a1 = document.getElementById("arqueroEquipo1");
    const a2 = document.getElementById("arqueroEquipo2");

    e1.innerHTML = "";
    e2.innerHTML = "";

    equipo1.forEach(j => {
        const iconos = `${j === arquero1 ? "🧤" : ""}${j === capitan1 ? "[c]" : ""}`;
        e1.innerHTML += `<li>${iconos} ${j}</li>`;
    });

    equipo2.forEach(j => {
        const iconos = `${j === arquero2 ? "🧤" : ""}${j === capitan2 ? "[c]" : ""}`;
        e2.innerHTML += `<li>${iconos} ${j}</li>`;
    });

    a1.innerText = `Arquero: ${arquero1} 🧤`;
    a2.innerText = `Arquero: ${arquero2} 🧤`;
});

connection.on("SalaActualizada", (sala) => {
    objetoSala = sala;
    actualizarSelectoresCapitanes(sala);
    if (sala.equipo1Seleccionado) {
        document.querySelector("#fotoequipo1").innerHTML = `
            <div class="text-center">
                <img src="/images/equipos/${sala.nombreEquipo1}.png" style="height:40px;" class="me-2">
            </div>`;
    }
    if (sala.equipo2Seleccionado) {
        document.querySelector("#fotoequipo2").innerHTML = `
            <div class="text-center">
                <img src="/images/equipos/${sala.nombreEquipo2}.png" style="height:40px;" class="me-2">
            </div>`;
    }

    actualizarEstadoBotonIniciar(sala);
});

connection.on("EquipoSeleccionado", (equipoNumero, nombreEquipo) => {
    // Mostrar el nombre y escudo
    let contenedor = document.querySelector(`#fotoequipo${equipoNumero}`);
    contenedor.innerHTML = `
        <div class="text-center">
            <img src="/images/equipos/${nombreEquipo}.png" style="height:40px;" class="me-2">
        </div>`;
});

connection.on("PartidaIniciada", () => {
    // Ocultar seccion de equipos y boton
    document.getElementById("seccionEquipos").style.display = "none";
    // Mostrar seccion de juego
    document.getElementById("seccionJuego").style.display = "block";
    generarGrid();
    inicializarMarcador(objetoSala);
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
    actualizarMarcador(marcador, objetoSala);
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
    actualizarMarcador(marcador, objetoSala);
    mostrarResultado(ganador);
});

connection.on("VolverAlLobby", (equipo1, arquero1, equipo2, arquero2) => {
    // Ocultar sección de juego
    document.getElementById("resultadoTanda").style.display = "none";
    document.getElementById("seccionJuego").style.display = "none";

    // Mostrar sección de selección de equipos
    document.getElementById("seccionEquipos").style.display = "block";

    // Resetear selects y botones
    const ddl1 = document.getElementById("ddlEquipo1");
    const ddl2 = document.getElementById("ddlEquipo2");
    const btn1 = document.querySelector("#seleccionEquipo1 button");
    const btn2 = document.querySelector("#seleccionEquipo2 button");

    ddl1.disabled = false;
    ddl2.disabled = false;
    ddl1.value = "";
    ddl2.value = "";
    btn1.disabled = false;
    btn2.disabled = false;
    btn1.innerText = "Confirmar";
    btn2.innerText = "Confirmar";

    // Resetear fotos
    document.querySelector("#fotoequipo1").innerHTML = "";
    document.querySelector("#fotoequipo2").innerHTML = "";

    // Mostrar botón iniciar solo si sos owner
    document.getElementById("btnIniciar").style.display = owner ? "block" : "none";

    // Resetear objetoSala con jugadores y arqueros
    objetoSala = {
        Equipo1: equipo1,
        Equipo2: equipo2,
        ArqueroEquipo1: arquero1,
        ArqueroEquipo2: arquero2,
        nombreEquipo1: null,
        nombreEquipo2: null,
        equipo1Seleccionado: false,
        equipo2Seleccionado: false
    };
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

    // Mostrar imagen del equipo ganador
    let nombreEquipoGanador = ganador === "Equipo 1" ? objetoSala.nombreEquipo1 : objetoSala.nombreEquipo2;

    mensaje.innerHTML = `
  <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
    <img src="/images/copa.png" style="height:3rem;" class="align-middle">
    <img src="/images/equipos/${nombreEquipoGanador}.png" style="height:3rem;" class="align-middle">
  </span>
`;

    divResultado.style.display = "block";

    // Botón revancha
    //btnRevancha.style.display = "inline-block";
    //btnRevancha.disabled = !owner;
    //btnRevancha.tooltip = owner ? "" : "Solo el líder puede reiniciar la partida";

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

function actualizarMarcador(marcador, sala) {
    const eq1 = document.getElementById("marcadorEquipo1");
    const eq2 = document.getElementById("marcadorEquipo2");

    // Reemplazar texto "Equipo 1" y "Equipo 2" por imagen
    const cont1 = eq1.previousElementSibling;
    const cont2 = eq2.previousElementSibling;
    cont1.innerHTML = `<img src="/images/equipos/${sala.nombreEquipo1}.png" style="height:24px;">`;
    cont2.innerHTML = `<img src="/images/equipos/${sala.nombreEquipo2}.png" style="height:24px;">`;

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

function inicializarMarcador(sala) {
    const eq1 = document.getElementById("marcadorEquipo1");
    const eq2 = document.getElementById("marcadorEquipo2");

    eq1.innerHTML = "";
    eq2.innerHTML = "";

    // Reemplazar texto "Equipo 1" y "Equipo 2" por imagen
    const cont1 = eq1.previousElementSibling;
    const cont2 = eq2.previousElementSibling;
    cont1.innerHTML = `<img src="/images/equipos/${sala.nombreEquipo1}.png" style="height:24px;">`;
    cont2.innerHTML = `<img src="/images/equipos/${sala.nombreEquipo2}.png" style="height:24px;">`;

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


async function seleccionarEquipo(equipoNumero) {
    const ddl = document.getElementById(`ddlEquipo${equipoNumero}`);
    const equipo = ddl.value;

    if (!equipo) {
        alert("Elegí un equipo antes de confirmar.");
        return;
    }
    await ensureConnection();
    await connection.invoke("SeleccionarEquipo", salaActual, equipoNumero, equipo);
}

function actualizarSelectoresCapitanes(sala) {
    const ddl1 = document.getElementById("ddlEquipo1");
    const ddl2 = document.getElementById("ddlEquipo2");
    const btn1 = document.querySelector("#seleccionEquipo1 button");
    const btn2 = document.querySelector("#seleccionEquipo2 button");

    // Mostrar equipos ya seleccionados
    if (sala.equipo1Seleccionado) {
        ddl1.value = sala.nombreEquipo1;
        btn1.innerText = "Equipo confirmado";
        ddl1.disabled = true;
        btn1.disabled = true;
    }
    if (sala.equipo2Seleccionado) {
        ddl2.value = sala.nombreEquipo2;
        btn2.innerText = "Equipo confirmado";
        ddl2.disabled = true;
        btn2.disabled = true;
    }

    const esCapitanEquipo1 = nombreUsuario === sala.owner;
    const esCapitanEquipo2 = nombreUsuario === sala.capitanEquipo2;

    // Equipo 1
    if (!esCapitanEquipo1 && !sala.equipo1Seleccionado) {
        ddl1.disabled = true;
        btn1.disabled = true;
        btn1.innerText = "Capitán eligiendo equipo...";
    } else if (esCapitanEquipo1 && !sala.equipo1Seleccionado) {
        ddl1.disabled = false;
        btn1.disabled = false;
        btn1.innerText = "Confirmar";
    }

    // Equipo 2
    if (!esCapitanEquipo2 && !sala.equipo2Seleccionado) {
        ddl2.disabled = true;
        btn2.disabled = true;
        btn2.innerText = "Capitán eligiendo equipo...";
    } else if (esCapitanEquipo2 && !sala.equipo2Seleccionado) {
        ddl2.disabled = false;
        btn2.disabled = false;
        btn2.innerText = "Confirmar";
    }
}

function actualizarEstadoBotonIniciar(sala) {
    const btnIniciar = document.getElementById("btnIniciar");
    let mensaje = document.getElementById("mensajeEsperandoEquipos");

    if (!mensaje) {
        mensaje = document.createElement("span");
        mensaje.id = "mensajeEsperandoEquipos";
        mensaje.style.color = "red";
        mensaje.style.display = "block"; 
        mensaje.style.marginTop = "0.5rem";
        btnIniciar.parentNode.appendChild(mensaje);
    }

    if (owner) {
        if (sala.equipo1Seleccionado && sala.equipo2Seleccionado) {
            btnIniciar.disabled = false;
            mensaje.innerText = "";
        } else {
            btnIniciar.disabled = true;
            mensaje.innerText = "Esperando confirmación de equipos";
        }
    } else {
        btnIniciar.disabled = true;
        mensaje.innerText = "Solo el lider puede iniciar la partida"; // otros jugadores no ven mensaje
    }
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

async function ensureConnection() {
    if (connection.state !== signalR.HubConnectionState.Connected) {
        try {
            await connection.start();
            console.log("Re-conectado al hub");
        } catch (err) {
            console.error("Error reconectando al hub:", err);
            alert("Error de conexión, recarga la página.");
        }
    }
}
