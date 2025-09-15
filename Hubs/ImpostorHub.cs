using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;

namespace FutArg11.Hubs
{
    using Microsoft.AspNetCore.SignalR;
    using System.IO;

    public class ImpostorHub : Hub
    {
        private static Dictionary<string, Sala> salas = new();
        private static List<string> futbolistas = new();
        private readonly IWebHostEnvironment _env;

        // Leer CSV al iniciar el Hub
        public ImpostorHub(IWebHostEnvironment env)
        {
            _env = env;

            // Cargar futbolistas solo una vez
            if (futbolistas.Count == 0)
            {
                var rutaCsv = Path.Combine(_env.WebRootPath, "data", "jugadores.csv");
                if (File.Exists(rutaCsv))
                {
                    futbolistas = File.ReadAllLines(rutaCsv)
                                      .Select(l => l.Split(',')[0].Trim())
                                      .Where(n => !string.IsNullOrWhiteSpace(n))
                                      .ToList();
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

            // Elegimos un futbolista aleatorio para todos los jugadores normales
            string futbolistaComun = ObtenerFutbolistaAleatorio();

            // Enviar contador de 5 segundos
            await Clients.Group(sala).SendAsync("ContadorInicio", 5);
            await Task.Delay(5000); // Esperar antes de revelar roles

            // Asignar roles
            foreach (var jugador in jugadores)
            {
                if (impostores.Contains(jugador))
                {
                    await Clients.Group(sala).SendAsync("RolAsignado", jugador, "Impostor", null);
                }
                else
                {
                    await Clients.Group(sala).SendAsync("RolAsignado", jugador, "Jugador", futbolistaComun);
                }

            }
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
    }

    // Clase para representar cada sala
    public class Sala
    {
        public string Owner { get; set; }
        public List<string> Jugadores { get; set; } = new();
        public int Impostores { get; set; } = 1;
    }
}
