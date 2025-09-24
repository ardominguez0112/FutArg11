namespace FutArg11.Hubs
{
    using FutArg11.Models.Entities;
    using Microsoft.AspNetCore.SignalR;
    using System.IO;
    using System.Text.Json;

    public class ImpostorHub : Hub
    {
        private static Dictionary<string, Sala> salas = new();
        private static Dictionary<string, Dictionary<string, int>> votosPorSala = new();
        private static Dictionary<string, HashSet<string>> jugadoresQueVotaron = new();
        private static List<string> futbolistas = new();
        private readonly IWebHostEnvironment _env;

        // Leer CSV al iniciar el Hub
        public ImpostorHub(IWebHostEnvironment env)
        {
            _env = env;

            // Cargar futbolistas solo una vez
            if (futbolistas.Count == 0)
            {
                var rutaJson = Path.Combine(_env.WebRootPath, "data", "jugadores.json");
                if (File.Exists(rutaJson))
                {
                    var jsonContent = File.ReadAllText(rutaJson);

                    var listaObjetos = JsonSerializer.Deserialize<List<Jugador>>(jsonContent);

                    futbolistas = listaObjetos?
                        .Where(f => !string.IsNullOrWhiteSpace(f.NombreCompleto))
                        .Select(f => f.NombreCompleto.Trim())
                        .ToList() ?? new List<string>();
                }
            }
        }

        // Crear sala
        public async Task CrearSala(string sala, string owner)
        {
            if (!salas.ContainsKey(sala))
            {
                salas[sala] = new Sala
                {
                    Owner = owner,
                    Jugadores = new List<string> { owner },
                    Impostores = 1
                };
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, sala);
            await EnviarListaJugadores(sala);
        }

        // Unirse a sala
        public async Task UnirseSala(string sala, string nombre)
        {
            if (!salas.ContainsKey(sala)) return;

            salas[sala].Jugadores.Add(nombre);
            await Groups.AddToGroupAsync(Context.ConnectionId, sala);
            await EnviarListaJugadores(sala);
        }

        // Configurar cantidad de impostores
        public async Task ConfigurarImpostores(string sala, int cantidad)
        {
            if (!salas.ContainsKey(sala)) return;
            salas[sala].Impostores = cantidad;
            await Clients.Group(sala).SendAsync("ImpostoresConfigurados", cantidad);
        }

        // Iniciar partida
        public async Task IniciarPartida(string sala)
        {
            if (!salas.ContainsKey(sala)) return;

            var jugadores = salas[sala].Jugadores.ToList();
            var cantidadImpostores = salas[sala].Impostores;
            var rnd = new Random();

            // Selección aleatoria de impostores
            var impostores = jugadores.OrderBy(x => rnd.Next()).Take(cantidadImpostores).ToList();
            salas[sala].ImpostoresList = impostores;

            // Elegimos un futbolista aleatorio para todos los jugadores normales
            string futbolistaComun = ObtenerFutbolistaAleatorio();

            // Enviar contador de 5 segundos
            await Clients.Group(sala).SendAsync("ContadorInicio", 5, cantidadImpostores);
            await Task.Delay(5000); // Esperar antes de revelar roles

            // Asignar roles
            foreach (var jugador in jugadores)
            {
                if (impostores.Contains(jugador))
                {
                    await Clients.Group(sala).SendAsync("RolAsignado", jugador, "Impostor", null, jugadores);
                }
                else
                {
                    await Clients.Group(sala).SendAsync("RolAsignado", jugador, "Jugador", futbolistaComun, jugadores);
                }

            }
        }

        public async Task ReiniciarPartida(string sala)
        {
            if (!salas.ContainsKey(sala)) return;

            var s = salas[sala];

            // Limpiar estado de la partida
            s.ImpostoresList.Clear();
            s.Muertos.Clear();
            if (votosPorSala.ContainsKey(sala)) votosPorSala[sala].Clear();
            if (jugadoresQueVotaron.ContainsKey(sala)) jugadoresQueVotaron[sala].Clear();

            // Avisar a todos que la partida se reinicia
            await Clients.Group(sala).SendAsync("PartidaReiniciada");
        }

        // Devuelve un futbolista aleatorio del CSV
        private string ObtenerFutbolistaAleatorio()
        {
            if (futbolistas.Count == 0) return "Jugador de ejemplo";
            var rnd = new Random();
            return futbolistas[rnd.Next(futbolistas.Count)];
        }

        // Actualiza la lista de jugadores de la sala
        private async Task EnviarListaJugadores(string sala)
        {
            if (!salas.ContainsKey(sala)) return;

            var s = salas[sala];
            await Clients.Group(sala).SendAsync("ActualizarListaJugadores", s.Jugadores, s.Owner);
        }

        private (int impostoresVivos, int inocentesVivos) ContarVivos(Sala s)
        {
            int impostoresVivos = s.ImpostoresList.Count(i => !s.Muertos.Contains(i));
            int inocentesVivos = s.Jugadores.Count(j => !s.ImpostoresList.Contains(j) && !s.Muertos.Contains(j));
            return (impostoresVivos, inocentesVivos);
        }

        public async Task VotarJugador(string sala, string jugadorVotado)
        {
            if (!salas.ContainsKey(sala)) return;

            var s = salas[sala];

            // Inicializar votos y registro de jugadores que ya votaron
            if (!votosPorSala.ContainsKey(sala))
                votosPorSala[sala] = new Dictionary<string, int>();
            if (!jugadoresQueVotaron.ContainsKey(sala))
                jugadoresQueVotaron[sala] = new HashSet<string>();

            // Evitar que un jugador vote más de una vez
            if (jugadoresQueVotaron[sala].Contains(Context.ConnectionId))
                return;

            jugadoresQueVotaron[sala].Add(Context.ConnectionId);

            // Inicializar contador de votos del jugador
            if (!votosPorSala[sala].ContainsKey(jugadorVotado))
                votosPorSala[sala][jugadorVotado] = 0;

            votosPorSala[sala][jugadorVotado]++;

            // Enviar actualización de votos a todos
            await Clients.Group(sala).SendAsync("VotoActualizado", jugadorVotado, votosPorSala[sala][jugadorVotado]);

            // Si todos los jugadores vivos votaron
            int jugadoresVivos = s.Jugadores.Count - s.Muertos.Count; // asumimos que Sala tiene lista de jugadores muertos
            if (jugadoresQueVotaron[sala].Count >= jugadoresVivos)
            {
                var maxVotos = votosPorSala[sala].Max(x => x.Value);
                var masVotadoList = votosPorSala[sala].Where(x => x.Value == maxVotos).Select(x => x.Key).ToList();

                if (masVotadoList.Count > 1)
                {
                    // Empate
                    await Clients.Group(sala).SendAsync("VotacionEmpate", "Empate, todos los jugadores votan de nuevo");

                    // Reset para nueva votación
                    votosPorSala[sala].Clear();
                    jugadoresQueVotaron[sala].Clear();
                }
                else
                {
                    var masVotado = masVotadoList[0];
                    bool eraImpostor = s.ImpostoresList.Contains(masVotado);

                    if (eraImpostor)
                        s.ImpostoresList.Remove(masVotado); // marcar impostor eliminado

                    // Marcar jugador como muerto
                    if (!s.Muertos.Contains(masVotado))
                        s.Muertos.Add(masVotado);

                    var (impVivos, inocVivos) = ContarVivos(s);

                    // Verificar si ganan los impostores
                    if (impVivos >= inocVivos)
                    {
                        await Clients.Group(sala).SendAsync("PartidaTerminada", "¡Los impostores han ganado!");
                        votosPorSala[sala].Clear();
                        jugadoresQueVotaron[sala].Clear();
                        return; // No seguimos con la votación normal
                    }

                    bool quedanImpostores = s.ImpostoresList.Count > 0;

                    await Clients.Group(sala).SendAsync("VotacionFinalizada", masVotado, eraImpostor, quedanImpostores);

                    // Reset para próxima ronda si quedan impostores
                    votosPorSala[sala].Clear();
                    jugadoresQueVotaron[sala].Clear();
                }
            }
        }
    }

    // Clase para representar cada sala
    public class Sala
    {
        public string Owner { get; set; }
        public List<string> Jugadores { get; set; } = new();
        public int Impostores { get; set; } = 1;
        public List<string> ImpostoresList { get; set; } = new();
        public List<string> Muertos { get; set; } = new();
    }


}
