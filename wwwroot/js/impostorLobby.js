// =====================
// Variables globales
// =====================
let owner = false;
let salaActual = "";

// Conexión a SignalR
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/impostorHub")
    .configureLogging(signalR.LogLevel.Information)
    .build();

let conexionLista = false;

// =====================
// Eventos SignalR
// =====================

// Actualiza lista de jugadores y líder
connection.on("ActualizarListaJugadores", (jugadores, lider) => {
    const lista = document.getElementById("listaJugadores");
    lista.innerHTML = `<h5>Líder de la sala: ${lider}</h5><ul>`;
    jugadores.forEach(j => lista.innerHTML += `<li>${j}</li>`);
    lista.innerHTML += "</ul>";
});

// Confirmación de impostores configurados
connection.on("ImpostoresConfigurados", (cantidad) => {
    alert("Cantidad de impostores configurada: " + cantidad);
});

// Contador de inicio de partida
connection.on("ContadorInicio", (segundos) => {
    const contador = document.getElementById("contador");
    let count = segundos;
    contador.innerText = `La partida inicia en ${count}...`;

    const interval = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(interval);
            contador.innerText = "¡Partida iniciada!";
        } else {
            contador.innerText = `La partida inicia en ${count}...`;
        }
    }, 1000);
});

// Asignación de rol después del contador
connection.on("RolAsignado", (jugador, rol, futbolista) => {
    const nombreUsuario = owner
        ? document.getElementById("txtNombreCrear").value
        : document.getElementById("txtNombreUnirse").value;

    if (nombreUsuario === jugador) {
        const div = document.getElementById("rolJugador");
        if (rol === "Impostor") {
            div.innerHTML = `<h3 style="color:red;">¡IMPOSTOR!</h3>`;
        } else {
            div.innerHTML = `<h3 style="color:green;">El futbolista es: ${futbolista}</h3>`;
        }
    }
});

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
    if (!conexionLista) { alert("Esperando conexión al servidor..."); return; }

    let nombre = document.getElementById("txtNombreCrear").value.trim();
    if (!nombre) { alert("Ingresa tu nombre"); return; }

    let sala = Math.random().toString(36).substring(2, 6).toUpperCase();
    salaActual = sala;
    owner = true;

    await connection.invoke("CrearSala", sala, nombre);

    // Mostrar popup
    document.getElementById("codigoSala").innerText = sala;
    document.getElementById("popupSala").style.display = "block";
    document.getElementById("configuracionOwner").style.display = "block";
}

// Unirse a sala
async function unirseSala() {
    if (!conexionLista) { alert("Esperando conexión al servidor..."); return; }

    let sala = document.getElementById("txtCodigoUnirse").value.trim();
    let nombre = document.getElementById("txtNombreUnirse").value.trim();
    if (!sala || !nombre) { alert("Completa todos los datos"); return; }

    salaActual = sala;
    owner = false;

    await connection.invoke("UnirseSala", sala, nombre);

    // Mostrar popup
    document.getElementById("codigoSala").innerText = sala;
    document.getElementById("popupSala").style.display = "block";
}

// Iniciar partida (solo owner)
async function iniciarPartida() {
    if (!salaActual) return;

    let cantidad = parseInt(document.getElementById("numImpostores").value);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    // Invocar Hub
    await connection.invoke("ConfigurarImpostores", salaActual, cantidad);
    await connection.invoke("IniciarPartida", salaActual);
}
