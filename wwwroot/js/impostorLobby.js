// =====================
// Variables globales
// =====================
let owner = false;
let salaActual = "";
let numImpostores = 1;
const maxImpostores = 5 
const minImpostores = 1;
let jugadorSeleccionado = null; // para votación
let votos = {}; // jugador -> cantidad de votos
let jugadoresMuertos = new Set();
let votoRealizado = false;

// Conexión a SignalR
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/impostorHub", {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

let conexionLista = false;

// =====================
// Eventos SignalR
// =====================

// Actualiza lista de jugadores y líder
connection.on("ActualizarListaJugadores", (jugadores, lider) => {
    const lista = document.getElementById("listaJugadores");
    lista.innerHTML = "<ul>";

    jugadores.forEach(j => {
        // Si es el líder, agregar "(Líder)" al lado del nombre
        const texto = j === lider ? `${j} (Líder)` : j;
        lista.innerHTML += `<li>${texto}</li>`;
    });

    lista.innerHTML += "</ul>";
});

// Confirmación de impostores configurados
connection.on("ImpostoresConfigurados", (cantidad) => {
    document.getElementById("seccionLobby").style.display = "none";
});

// Contador de inicio de partida
connection.on("ContadorInicio", (segundos, cantidadImpostores) => {
    const contador = document.getElementById("contador");
    let count = segundos;
    let impostores = cantidadImpostores;
    contador.innerText = `La partida inicia en ${count}...`;

    const interval = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(interval);
            contador.innerText = `Cant. impostores configurada: ${impostores}`;
        } else {
            contador.innerText = `La partida inicia en ${count}...`;
        }
    }, 1000);
});

// Asignación de rol después del contador
connection.on("RolAsignado", (jugador, rol, futbolista, jugadores) => {
    nombreUsuario = owner
        ? document.getElementById("txtNombreCrear").value
        : document.getElementById("txtNombreUnirse").value;

    // Mostrar rol al usuario
    const div = document.getElementById("rolJugador");
    if (nombreUsuario === jugador) {
        div.innerHTML = rol === "Impostor"
            ? `<h3 style="color:red;">¡IMPOSTOR!</h3>`
            : `<h3 style="color:green;">${futbolista}</h3>`;
    }

    // Preparar votación
    const votacionDiv = document.getElementById("votacion");
    const listaVotacion = document.getElementById("listaVotacion");
    votacionDiv.style.display = "block";
    listaVotacion.innerHTML = "";
    jugadorSeleccionado = null;
    votos = {};
    votoRealizado = false;

    jugadores.forEach(j => votos[j] = 0);

    // Crear botones de votación
    jugadores.forEach(j => {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-light";
        btn.innerText = j;

        // Deshabilitar si es el propio usuario o está muerto
        btn.disabled = (j === nombreUsuario) || jugadoresMuertos.has(j);

        btn.onclick = () => seleccionarJugador(btn, j);
        listaVotacion.appendChild(btn);

        const spanVoto = document.createElement("span");
        spanVoto.id = `votos-${j}`;
        spanVoto.className = "ms-1 fw-bold";
        spanVoto.innerText = "";
        btn.appendChild(spanVoto);
    });

    // Botón VOTAR
    // Botón VOTAR
    let btnVotar = document.getElementById("btnVotar");
    if (!btnVotar) {
        // Contenedor centrado
        const divCentrado = document.createElement("div");
        divCentrado.style.display = "flex";
        divCentrado.style.justifyContent = "center";
        divCentrado.style.marginTop = "10px"; // opcional, separación

        btnVotar = document.createElement("button");
        btnVotar.id = "btnVotar";
        btnVotar.className = "btn btn-warning";
        btnVotar.disabled = true;
        btnVotar.innerText = "VOTAR";
        btnVotar.onclick = () => {
            if (!jugadorSeleccionado || votoRealizado) return;

            connection.invoke("VotarJugador", salaActual, jugadorSeleccionado);
            votoRealizado = true;

            btnVotar.disabled = true;
            jugadorSeleccionado = null;

            // deseleccionar botones
            document.querySelectorAll("#listaVotacion button").forEach(b => b.classList.remove("btn-primary"));
        };

        divCentrado.appendChild(btnVotar);
        votacionDiv.appendChild(divCentrado);
    }

    btnVotar.disabled = true;

    // Limpiar mensaje previo
    const msgPrevio = document.getElementById("mensajeVotacion");
    if (msgPrevio) msgPrevio.remove();
});

// Evento de actualización de votos
connection.on("VotoActualizado", (jugador, totalVotos) => {
    const span = document.getElementById(`votos-${jugador}`);
    if (span) span.innerText = ` (${totalVotos})`;
});

// Finaliza votación
connection.on("VotacionFinalizada", (jugador, eraImpostor, quedanImpostores) => {
    const btn = Array.from(document.querySelectorAll("#listaVotacion button"))
        .find(b => b.innerText.includes(jugador));
    if (!btn) return;

    btn.disabled = true;
    btn.classList.remove("btn-outline-light");
    btn.classList.add("btn-secondary");
    btn.innerHTML = `${jugador} <i class="fas fa-skull-crossbones ms-1"></i>`;

    jugadoresMuertos.add(jugador);

    // Resetear votos visualmente
    document.querySelectorAll("#listaVotacion span").forEach(s => s.innerText = "");

    // Mensaje
    if (eraImpostor) {
        mostrarMensaje(`${jugador} era el impostor!`, "bg-danger", true);
    } else {
        mostrarMensaje(`No era impostor, han matado a un inocente`, "bg-warning", false);
    }

    votoRealizado = false;

    // Si quedan impostores vivos, continuar votando
    if (eraImpostor && !quedanImpostores) {
        // Termina la partida, mostrar botón jugar de nuevo
        mostrarBotonJugarDeNuevo();
    }
});

connection.on("VotacionEmpate", (mensaje) => {
    mostrarMensaje(mensaje, "bg-info", false);

    // Resetear votos
    document.querySelectorAll("#listaVotacion span").forEach(s => s.innerText = "");

    // Reiniciar botones de votación
    const listaVotacion = document.getElementById("listaVotacion");
    Array.from(listaVotacion.children).forEach(btn => {
        btn.disabled = (btn.innerText.includes(nombreUsuario)) || jugadoresMuertos.has(btn.innerText);
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline-light");
    });

    // Botón votar deshabilitado
    const btnVotar = document.getElementById("btnVotar");
    if (btnVotar) btnVotar.disabled = true;
    votoRealizado = false;
});

connection.on("PartidaTerminada", (mensaje) => {
    mostrarMensaje(mensaje, "bg-danger", true);
    mostrarBotonJugarDeNuevo();
});

connection.on("PartidaReiniciada", () => {
    resetearVisualPartida();

    document.getElementById("seccionLobby").style.display = "block";

    // Si no sos owner, los botones de configuración siguen deshabilitados
    if (!owner) {
        document.getElementById("btnMenosImpostores").disabled = true;
        document.getElementById("btnMasImpostores").disabled = true;
        document.querySelector("#configuracionOwner button.btn-success").disabled = true;
    }
});



function seleccionarJugador(btn, jugador) {
    if (votoRealizado || jugadoresMuertos.has(nombreUsuario)) return;

    document.querySelectorAll("#listaVotacion button").forEach(b => b.classList.remove("btn-primary"));
    btn.classList.add("btn-primary");
    jugadorSeleccionado = jugador;
    const btnVotar = document.getElementById("btnVotar");
    if (btnVotar) btnVotar.disabled = false;
}

// =====================
// Conexión inicial
// =====================
connection.start()
    .then(() => {
        console.log("✅ Conectado al hub");
        conexionLista = true;
    })
    .catch(err => console.error("❌ Error al conectar:", err));

connection.onclose(() => {
    console.warn("🔴 Conexión cerrada");
    conexionLista = false;
});

// =====================
// Funciones llamadas desde HTML
// =====================

// Crear sala (owner)
async function crearSala() {
    if (!conexionLista) {
        document.getElementById("errorNombreCrear").innerText = "Esperando conexión al servidor...";
        return;
    }

    let nombre = document.getElementById("txtNombreCrear").value.trim();
    const errorSpan = document.getElementById("errorNombreCrear");

    if (!nombre) {
        errorSpan.innerText = "Ingresa tu nombre";
        return;
    } else {
        errorSpan.innerText = ""; // limpiar mensaje
    }

    let sala = Math.random().toString(36).substring(2, 6).toUpperCase();
    salaActual = sala;
    owner = true;

    await connection.invoke("CrearSala", sala, nombre);

    // Mostrar popup
    document.getElementById("codigoSala").innerText = sala;
    document.getElementById("popupSala").style.display = "block";
    document.getElementById("configuracionOwner").style.display = "block";
}

async function unirseSala() {
    if (!conexionLista) {
        document.getElementById("errorCodigoUnirse").innerText = "Esperando conexión al servidor...";
        return;
    }

    let sala = document.getElementById("txtCodigoUnirse").value.trim().toUpperCase();
    let nombre = document.getElementById("txtNombreUnirse").value.trim();
    let mensaje = document.getElementById("mensajeEsperandoInicio");

    const errorCodigo = document.getElementById("errorCodigoUnirse");
    const errorNombre = document.getElementById("errorNombreUnirse");

    let hayError = false;

    if (!sala) {
        errorCodigo.innerText = "Ingresa el código de sala";
        hayError = true;
    } else {
        errorCodigo.innerText = "";
    }

    if (!nombre) {
        errorNombre.innerText = "Ingresa tu nombre";
        hayError = true;
    } else {
        errorNombre.innerText = "";
    }

    if (hayError) return;

    salaActual = sala;
    owner = false;

    await connection.invoke("UnirseSala", sala, nombre);

    // Mostrar popup
    document.getElementById("codigoSala").innerText = sala;
    document.getElementById("popupSala").style.display = "block";
    document.getElementById("configuracionOwner").style.display = "block"; // <-- SIEMPRE mostrar

    // Si NO sos owner, deshabilitamos
    document.getElementById("btnMenosImpostores").disabled = true;
    document.getElementById("btnMasImpostores").disabled = true;
    document.querySelector("#configuracionOwner button.btn-success").disabled = true;
    mensaje.innerText = "Solo el lider puede configurar la partida";
}

function cambiarImpostores(delta) {
    numImpostores += delta;
    if (numImpostores < minImpostores) numImpostores = minImpostores;
    if (numImpostores > maxImpostores) numImpostores = maxImpostores;
    document.getElementById("numImpostoresDisplay").innerText = numImpostores;
}

// Iniciar partida (solo owner)
async function iniciarPartida() {
    if (!salaActual) return;

    let cantidad = numImpostores;
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    document.getElementById("seccionLobby").style.display = "none";

    // Invocar Hub
    await connection.invoke("ConfigurarImpostores", salaActual, cantidad);
    await connection.invoke("IniciarPartida", salaActual);
}

// =====================
// Función para mostrar mensajes
// =====================
function mostrarMensaje(texto, claseFondo, permanente = false) {
    let msg = document.getElementById("mensajeVotacion");
    if (!msg) {
        msg = document.createElement("div");
        msg.id = "mensajeVotacion";
        msg.className = `mt-2 p-2 text-center fw-bold ${claseFondo}`;
        document.getElementById("votacion").appendChild(msg);
    }
    msg.innerText = texto;
    msg.className = `mt-2 p-2 text-center fw-bold ${claseFondo}`;

    if (!permanente) {
        setTimeout(() => {
            if (msg) msg.remove();
        }, 3000);
    }
}

// =====================
// Botón jugar de nuevo
// =====================
function mostrarBotonJugarDeNuevo() {
    const votacionDiv = document.getElementById("votacion");
    let btnNuevo = document.getElementById("btnJugarDeNuevo");

    if (!btnNuevo) {
        btnNuevo = document.createElement("button");
        btnNuevo.id = "btnJugarDeNuevo";
        btnNuevo.className = "btn btn-primary mt-3 d-block mx-auto";
        btnNuevo.innerText = "Jugar de nuevo";

        // Solo el owner lo puede clickear
        btnNuevo.disabled = !owner;

        // Handler del owner
        btnNuevo.onclick = () => {
            if (!owner) return; // seguridad extra
            connection.invoke("ReiniciarPartida", salaActual); // mandar a todos
        };

        votacionDiv.appendChild(btnNuevo);
    } else {
        // Si ya existe, solo actualizamos el estado por si cambió owner
        btnNuevo.disabled = !owner;
    }
}

function resetearVisualPartida() {
    // Ocultar rol y mensaje
    const rolDiv = document.getElementById("rolJugador");
    if (rolDiv) rolDiv.innerHTML = "";

    // Ocultar mensaje de votación
    const msg = document.getElementById("mensajeVotacion");
    if (msg) msg.remove();

    // Resetear contador
    const contador = document.getElementById("contador");
    if (contador) contador.innerText = "";

    // Limpiar lista de votación
    const lista = document.getElementById("listaVotacion");
    if (lista) lista.innerHTML = "";

    // Ocultar sección de votación
    const votacionDiv = document.getElementById("votacion");
    if (votacionDiv) votacionDiv.style.display = "none";

    // Ocultar botón jugar de nuevo
    const btnNuevo = document.getElementById("btnJugarDeNuevo");
    if (btnNuevo) btnNuevo.remove();

    // Resetear variables locales
    jugadorSeleccionado = null;
    votoRealizado = false;
    jugadoresMuertos.clear();
    votos = {};
}

document.addEventListener("DOMContentLoaded", () => {
    const btnMenos = document.getElementById("btnMenosImpostores");
    const btnMas = document.getElementById("btnMasImpostores");
    const btnIniciar = document.getElementById("btnIniciarPartida");

    if (btnMenos) btnMenos.addEventListener("click", () => cambiarImpostores(-1));
    if (btnMas) btnMas.addEventListener("click", () => cambiarImpostores(1));
    if (btnIniciar) btnIniciar.addEventListener("click", iniciarPartida);
});
