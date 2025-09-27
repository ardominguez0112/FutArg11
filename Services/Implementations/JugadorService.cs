using System.Text.Json;
using FutArg11.Models.Entities;
using FutArg11.Services.Interfaces;

public class JugadorService : IJugadorService
{
    private readonly string _jsonPath;

    public JugadorService(IWebHostEnvironment env)
    {
        _jsonPath = Path.Combine(env.WebRootPath, "data", "jugadores.json");
    }

    public Jugador ObtenerJugadorAleatorio()
    {
        var jugadores = LeerJugadores();
        var random = new Random();
        return jugadores[random.Next(jugadores.Count)];
    }

    public List<Jugador> LeerJugadores()
    {
        if (!File.Exists(_jsonPath))
            throw new FileNotFoundException($"No se encontró el archivo: {_jsonPath}");

        var json = File.ReadAllText(_jsonPath);

        // Deserializamos directo a lista de Jugador
        var lista = JsonSerializer.Deserialize<List<Jugador>>(json);

        if (lista == null || lista.Count == 0)
            throw new InvalidOperationException("No se encontraron jugadores en el archivo JSON.");

        return lista;
    }
}
