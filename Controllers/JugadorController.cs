using FutArg11.Services;
using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class JugadorController : Controller
    {
        private readonly JugadorService _jugadorService;

        public JugadorController(JugadorService jugadorService)
        {
            _jugadorService = jugadorService;
        }

        public IActionResult Index()
        {
            //var jugadores = _jugadorService.ObtenerJugadores();
            return View();
        }
    }
}
