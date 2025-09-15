using FutArg11.Models.ViewModels;
using FutArg11.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

public class WordleController : Controller
{
    private readonly IWordleService _wordleService;
    private const int MAX_INTENTOS = 6;

    public WordleController(IWordleService wordleService)
    {
        _wordleService = wordleService;
    }

    [HttpGet]
    public IActionResult Index()
    {
        // Genera un nuevo apellido objetivo cada vez que se entra de cero
        var apellidoObjetivo = _wordleService.ObtenerPalabraObjetivo();

        // Inicializa ViewModel
        var vm = new WordleViewModel
        {
            ApellidoObjetivo = apellidoObjetivo,
            IntentosRestantes = MAX_INTENTOS,
            Intentos = new List<WordleIntento>()
        };

        // Guarda en TempData como JSON
        TempData["ApellidoObjetivo"] = apellidoObjetivo;
        TempData["IntentosRestantes"] = MAX_INTENTOS;
        TempData["Intentos"] = JsonSerializer.Serialize(vm.Intentos);
        TempData.Keep();

        return View(vm);
    }

    [HttpPost]
    public IActionResult Index(string intento)
    {
        // Recupera TempData
        var apellido = TempData["ApellidoObjetivo"] as string;
        var intentosRestantes = (int)TempData["IntentosRestantes"];
        var intentosJson = TempData["Intentos"] as string;

        // Deserializa lista de intentos
        var intentos = string.IsNullOrEmpty(intentosJson)
            ? new List<WordleIntento>()
            : JsonSerializer.Deserialize<List<WordleIntento>>(intentosJson);

        // Procesa el nuevo intento
        var resultado = new WordleIntento
        {
            Texto = intento,
            Letras = new List<WordleLetra>()
        };

        for (int i = 0; i < apellido.Length; i++)
        {
            var letra = intento.Length > i ? intento[i] : ' ';
            string estado;

            if (letra == apellido[i])
                estado = "correcta";
            else if (apellido.Contains(letra))
                estado = "presente";
            else
                estado = "ausente";

            resultado.Letras.Add(new WordleLetra { Letra = letra, Estado = estado });
        }

        // Agrega el intento a la lista
        intentos.Add(resultado);

        // Arma ViewModel
        var vm = new WordleViewModel
        {
            ApellidoObjetivo = apellido,
            IntentosRestantes = intentosRestantes - 1,
            Intentos = intentos,
            IntentoActual = ""
        };

        // Guarda todo nuevamente en TempData como JSON
        TempData["ApellidoObjetivo"] = apellido;
        TempData["IntentosRestantes"] = vm.IntentosRestantes;
        TempData["Intentos"] = JsonSerializer.Serialize(intentos);
        TempData.Keep();

        return View(vm);
    }
}
