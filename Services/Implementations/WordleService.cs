using FutArg11.Models.Enums;
using FutArg11.Services.Interfaces;
using System;
using System.Collections.Generic;

public class WordleService : IWordleService
{
    private readonly IJugadorService _jugadorService;

    public WordleService(IJugadorService jugadorService)
    {
        _jugadorService = jugadorService;
    }

    public string ObtenerPalabraObjetivo()
    {
        var jugador = _jugadorService.ObtenerJugadorAleatorio();
        return jugador.Apellido;
    }

    public List<WordleLetraEstado> ValidarIntento(string palabraObjetivo, string intento)
    {
        var resultado = new List<WordleLetraEstado>();

        var objetivo = palabraObjetivo.ToUpperInvariant();
        var intentoActual = intento.ToUpperInvariant();

        for (int i = 0; i < objetivo.Length; i++)
        {
            if (i >= intentoActual.Length)
            {
                resultado.Add(WordleLetraEstado.Incorrecta);
                continue;
            }

            if (objetivo[i] == intentoActual[i])
                resultado.Add(WordleLetraEstado.Correcta);
            else if (objetivo.Contains(intentoActual[i]))
                resultado.Add(WordleLetraEstado.Contenida);
            else
                resultado.Add(WordleLetraEstado.Incorrecta);
        }

        return resultado;
    }
}
