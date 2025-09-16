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

        // Reasignar arqueros aleatorios
        if (sala.Equipo1.Count > 0) sala.ArqueroEquipo1 = sala.Equipo1[rnd.Next(sala.Equipo1.Count)];
        if (sala.Equipo2.Count > 0) sala.ArqueroEquipo2 = sala.Equipo2[rnd.Next(sala.Equipo2.Count)];

        await Groups.AddToGroupAsync(Context.ConnectionId, codigo);
        await EnviarEquipos(codigo);
    }

    private async Task EnviarEquipos(string codigo)
    {
        var sala = salas[codigo];
        await Clients.Group(codigo).SendAsync("ActualizarEquipos",
            sala.Equipo1, sala.ArqueroEquipo1,
            sala.Equipo2, sala.ArqueroEquipo2);
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
        int maxDisparos = Math.Max(sala.Equipo1.Count, sala.Equipo2.Count) * 5; // asegurarse de tener suficientes
        for (int i = 0; i < 5; i++)
        {
            string p1 = sala.Equipo1[i % sala.Equipo1.Count];
            string p2 = sala.Equipo2.Count > 0 ? sala.Equipo2[i % sala.Equipo2.Count] : null;

            if (p2 != null)
            {
                tanda.Enqueue(new Turno { Equipo = 1, Pateador = p1, Arquero = sala.ArqueroEquipo2 });
                tanda.Enqueue(new Turno { Equipo = 2, Pateador = p2, Arquero = sala.ArqueroEquipo1 });
            }
            else
            {
                // Solo equipo 1 tiene jugadores
                tanda.Enqueue(new Turno { Equipo = 1, Pateador = p1, Arquero = null });
            }
        }
        return tanda;
    }

    public async Task NextTurn(string codigo)
    {
        var sala = salas[codigo];
        if (sala.Tanda.Count == 0)
        {
            await Clients.Group(codigo).SendAsync("FinTanda", sala.Marcador);
            return;
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

            await Clients.Group(codigo).SendAsync("ResultadoTurno", turno.Pateador, turno.Arquero, gol, sala.Marcador);

            await Task.Delay(1000);
            await NextTurn(codigo);
        }
    }
}

public class SalaPenales
{
    public string Owner { get; set; }
    public List<string> Equipo1 { get; set; } = new();
    public List<string> Equipo2 { get; set; } = new();
    public string ArqueroEquipo1 { get; set; }
    public string ArqueroEquipo2 { get; set; }
    public Queue<Turno> Tanda { get; set; }
    public Turno TurnoActual { get; set; }
    public Dictionary<string, List<string>> Marcador { get; set; }
}

public class Turno
{
    public int Equipo { get; set; }
    public string Pateador { get; set; }
    public string Arquero { get; set; }
    public (int fila, int col)? PosicionPateador { get; set; }
    public (int fila, int col)? PosicionArquero { get; set; }
}
