using Microsoft.AspNetCore.SignalR;

public class PenalesHub : Hub
{
    private static Dictionary<string, SalaPenales> salas = new();
    private readonly Random rnd = new();

    // Crear sala
    public async Task CrearSala(string codigo, string owner)
    {
        if (!salas.ContainsKey(codigo))
        {
            salas[codigo] = new SalaPenales
            {
                Owner = owner,
                Equipo1 = new List<string> { owner },
                ArqueroEquipo1 = owner,   // Owner siempre arquero del 1
                ArqueroEquipo2 = null      // Aún no hay jugadores
            };
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, codigo);
        await EnviarEquipos(codigo);
        await Clients.Group(codigo).SendAsync("SalaActualizada", salas[codigo]);
    }

    // Unirse a sala
    public async Task UnirseSala(string codigo, string nombre)
    {
        if (!salas.ContainsKey(codigo)) return;
        var sala = salas[codigo];

        // Balancear equipos
        if (sala.Equipo1.Count <= sala.Equipo2.Count)
            sala.Equipo1.Add(nombre);
        else
            sala.Equipo2.Add(nombre);

        // Asignar capitán del equipo 2 si es el primer jugador
        if (sala.Equipo2.Count == 1 && sala.Equipo1.Count == 1)
            sala.CapitanEquipo2 = nombre;

        // Reasignar arqueros aleatorios
        if (sala.Equipo1.Count > 0) sala.ArqueroEquipo1 = sala.Equipo1[rnd.Next(sala.Equipo1.Count)];
        if (sala.Equipo2.Count > 0) sala.ArqueroEquipo2 = sala.Equipo2[rnd.Next(sala.Equipo2.Count)];

        await Groups.AddToGroupAsync(Context.ConnectionId, codigo);
        await EnviarEquipos(codigo);

        await Clients.Group(codigo).SendAsync("SalaActualizada", sala);
    }

    private async Task EnviarEquipos(string codigo)
    {
        var sala = salas[codigo];
        await Clients.Group(codigo).SendAsync("ActualizarEquipos",
            sala.Equipo1, sala.ArqueroEquipo1, sala.Owner,
            sala.Equipo2, sala.ArqueroEquipo2, sala.CapitanEquipo2);
    }

    // Iniciar partida
    public async Task IniciarPartida(string codigo)
    {
        if (!salas.ContainsKey(codigo)) return;
        var sala = salas[codigo];

        // Inicializar marcador y tanda
        sala.Marcador = new Dictionary<string, List<string>>
        {
            { "Equipo1", new List<string>() },
            { "Equipo2", new List<string>() }
        };
        sala.Tanda = GenerarTanda(sala);

        // Ocultar selección y mostrar arco
        await Clients.Group(codigo).SendAsync("PartidaIniciada");

        // Primer turno
        await NextTurn(codigo);
    }

    private Queue<Turno> GenerarTanda(SalaPenales sala)
    {
        var tanda = new Queue<Turno>();

        // Generar 5 penales para cada equipo
        for (int i = 0; i < 5; i++)
        {
            if (sala.Equipo1.Count > 0)
            {
                string p1 = sala.Equipo1[i % sala.Equipo1.Count];
                tanda.Enqueue(new Turno { Equipo = 1, Pateador = p1, Arquero = sala.ArqueroEquipo2 });
            }
            if (sala.Equipo2.Count > 0)
            {
                string p2 = sala.Equipo2[i % sala.Equipo2.Count];
                tanda.Enqueue(new Turno { Equipo = 2, Pateador = p2, Arquero = sala.ArqueroEquipo1 });
            }
        }
        return tanda;
    }

    public async Task NextTurn(string codigo)
    {
        var sala = salas[codigo];

        int goles1 = sala.Marcador["Equipo1"].Count(x => x == "⚽");
        int goles2 = sala.Marcador["Equipo2"].Count(x => x == "⚽");
        int tiros1 = sala.Marcador["Equipo1"].Count;
        int tiros2 = sala.Marcador["Equipo2"].Count;

        // Definición anticipada en los primeros 5 tiros
        if (tiros1 < 5 || tiros2 < 5)
        {
            int restantes1 = 5 - tiros1;
            int restantes2 = 5 - tiros2;
            if ((goles1 > goles2 + restantes2) || (goles2 > goles1 + restantes1))
            {
                string ganador = goles1 > goles2 ? "Equipo 1" : "Equipo 2";

                await Clients.Group(codigo).SendAsync("FinTanda", sala.Marcador, ganador);
                return;
            }
        }

        // Si se acabaron los turnos
        if (sala.Tanda.Count == 0)
        {
            // Empate luego de 5 tiros => muerte súbita
            if (tiros1 >= 5 && tiros2 >= 5 && goles1 == goles2)
            {
                // Generar un nuevo par de tiros (uno por equipo)
                string p1 = sala.Equipo1[tiros1 % sala.Equipo1.Count];
                string p2 = sala.Equipo2[tiros2 % sala.Equipo2.Count];

                sala.Tanda.Enqueue(new Turno { Equipo = 1, Pateador = p1, Arquero = sala.ArqueroEquipo2 });
                sala.Tanda.Enqueue(new Turno { Equipo = 2, Pateador = p2, Arquero = sala.ArqueroEquipo1 });
            }
            else
            {
                string ganador = goles1 > goles2 ? "Equipo 1" : "Equipo 2";

                await Clients.Group(codigo).SendAsync("FinTanda", sala.Marcador, ganador);
                return;
            }
        }

        var turno = sala.Tanda.Dequeue();
        sala.TurnoActual = turno;
        await Clients.Group(codigo).SendAsync("NuevoTurno", turno.Pateador, turno.Arquero, turno.Equipo);
    }

    public async Task SeleccionarCelda(string codigo, string jugador, int fila, int col)
    {
        var sala = salas[codigo];
        var turno = sala.TurnoActual;

        if (jugador == turno.Pateador) turno.PosicionPateador = (fila, col);
        if (jugador == turno.Arquero) turno.PosicionArquero = (fila, col);

        if (turno.PosicionPateador != null && (turno.PosicionArquero != null || turno.Arquero == null))
        {
            bool gol = turno.Arquero != null ? turno.PosicionPateador.Value != turno.PosicionArquero.Value : true;
            string equipo = turno.Equipo == 1 ? "Equipo1" : "Equipo2";
            sala.Marcador[equipo].Add(gol ? "⚽" : "❌");

            await Clients.Group(codigo).SendAsync(
                    "ResultadoTurno",
                    turno.Pateador,
                    turno.Arquero,
                    gol,
                    sala.Marcador,
                    turno.PosicionPateador?.Item1,
                    turno.PosicionPateador?.Item2,
                    turno.PosicionArquero?.Item1,
                    turno.PosicionArquero?.Item2
                    );

            // Recalcular goles y tiros
            int goles1 = sala.Marcador["Equipo1"].Count(x => x == "⚽");
            int goles2 = sala.Marcador["Equipo2"].Count(x => x == "⚽");
            int tiros1 = sala.Marcador["Equipo1"].Count;
            int tiros2 = sala.Marcador["Equipo2"].Count;

            bool enMuerteSubita = tiros1 > 5 || tiros2 > 5;

            if (enMuerteSubita)
            {
                // Cada "par" son dos tiros: uno por cada equipo
                int tirosTotales = sala.Marcador["Equipo1"].Count + sala.Marcador["Equipo2"].Count;
                bool parCompleto = tirosTotales % 2 == 0; // solo evaluar al completar par

                if (parCompleto && goles1 != goles2)
                {
                    string ganador = goles1 > goles2 ? "Equipo 1" : "Equipo 2";
                    await Clients.Group(codigo).SendAsync("FinTanda", sala.Marcador, ganador);
                    return;
                }
            }
            else
            {
                // Lógica normal de definición anticipada
                int restantes1 = 5 - tiros1;
                int restantes2 = 5 - tiros2;

                if ((goles1 > goles2 + restantes2) || (goles2 > goles1 + restantes1))
                {
                    string ganador = goles1 > goles2 ? "Equipo 1" : "Equipo 2";
                    await Clients.Group(codigo).SendAsync("FinTanda", sala.Marcador, ganador);
                    return;
                }
            }

            // Esperar un momento antes del siguiente turno
            await Task.Delay(1000);
            await NextTurn(codigo);
        }
    }

    public async Task ReiniciarSala(string codigo)
    {
        if (!salas.ContainsKey(codigo)) return;
        var sala = salas[codigo];

        // Resetear nombres de equipo (para que los selects vuelvan a estar disponibles)
        sala.NombreEquipo1 = null;
        sala.NombreEquipo2 = null;

        // Reasignar arqueros aleatorios
        var rnd = new Random();
        if (sala.Equipo1.Count > 0)
            sala.ArqueroEquipo1 = sala.Equipo1[rnd.Next(sala.Equipo1.Count)];
        if (sala.Equipo2.Count > 0)
            sala.ArqueroEquipo2 = sala.Equipo2[rnd.Next(sala.Equipo2.Count)];

        // Resetear marcador, tanda y turno actual
        sala.Marcador = new Dictionary<string, List<string>>
    {
        { "Equipo1", new List<string>() },
        { "Equipo2", new List<string>() }
    };
        sala.Tanda = null;
        sala.TurnoActual = null;

        // Enviar equipos actualizados a todos
        await EnviarEquipos(codigo);

        // Mandar a todos a la vista de equipos (Volver al lobby)
        await Clients.Group(codigo).SendAsync("VolverAlLobby", sala.Equipo1, sala.ArqueroEquipo1, sala.Equipo2, sala.ArqueroEquipo2);
    }

    public async Task SeleccionarEquipo(string sala, int equipoNumero, string nombreEquipo)
    {
        if (salas.TryGetValue(sala, out var salaObj))
        {
            if (equipoNumero == 1 && nombreEquipo != null && nombreEquipo != "" && !salaObj.Equipo1Seleccionado)
            {
                salaObj.NombreEquipo1 = nombreEquipo;
            }
            else if (equipoNumero == 2 && nombreEquipo != null && nombreEquipo != "" && !salaObj.Equipo2Seleccionado)
            {
                salaObj.NombreEquipo2 = nombreEquipo;
            }

            // Avisar a todos en la sala que se eligió un equipo
            await Clients.Group(sala).SendAsync("EquipoSeleccionado", equipoNumero, nombreEquipo);
            await Clients.Group(sala).SendAsync("SalaActualizada", salaObj);
        }
    }
}

public class SalaPenales
{
    public string Owner { get; set; }
    public string CapitanEquipo2 { get; set; } // Primer jugador que entra a equipo 2
    public List<string> Equipo1 { get; set; } = new();
    public List<string> Equipo2 { get; set; } = new();
    public string NombreEquipo1 { get; set; }
    public string NombreEquipo2 { get; set; }
    public string ArqueroEquipo1 { get; set; }
    public string ArqueroEquipo2 { get; set; }
    public Queue<Turno> Tanda { get; set; }
    public Turno TurnoActual { get; set; }
    public Dictionary<string, List<string>> Marcador { get; set; }
    public bool Equipo1Seleccionado => !string.IsNullOrEmpty(NombreEquipo1);
    public bool Equipo2Seleccionado => !string.IsNullOrEmpty(NombreEquipo2);
}

public class Turno
{
    public int Equipo { get; set; }
    public string Pateador { get; set; }
    public string Arquero { get; set; }
    public (int fila, int col)? PosicionPateador { get; set; }
    public (int fila, int col)? PosicionArquero { get; set; }
}
