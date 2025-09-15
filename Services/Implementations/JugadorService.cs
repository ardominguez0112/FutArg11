using FutArg11.Models.Entities;
using FutArg11.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public class JugadorService : IJugadorService
{
    private readonly string _csvPath;

    public JugadorService(IWebHostEnvironment env)
    {
        _csvPath = Path.Combine(env.WebRootPath, "data", "jugadores.csv");
    }

    public Jugador ObtenerJugadorAleatorio()
    {
        var jugadores = LeerJugadores();
        var random = new Random();
        return jugadores[random.Next(jugadores.Count)];
    }

    private List<Jugador> LeerJugadores()
    {
        var lista = new List<Jugador>();

        if (!File.Exists(_csvPath))
            throw new FileNotFoundException($"No se encontró el archivo: {_csvPath}");

        var lineas = File.ReadAllLines(_csvPath).Skip(1);
        foreach (var linea in lineas)
        {
            var partes = linea.Split(',');

            if (partes.Length >= 1)
            {
                var nombreCompleto = partes[0].Trim();

                lista.Add(new Jugador
                {
                    NombreCompleto = nombreCompleto
                    // No hace falta poner Apellido, se calcula solo
                });
            }
        }

        return lista;
    }
}
