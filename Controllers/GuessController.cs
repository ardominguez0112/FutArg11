using FutArg11.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class GuessController : Controller
    {
        private readonly IJugadorService _jugadorService;

        public GuessController(IJugadorService jugadorService)
        {
            _jugadorService = jugadorService;
        }

        public IActionResult Index()
        {
            var jugador = _jugadorService.ObtenerJugadorAleatorio();

            var todosLosJugadores = _jugadorService.LeerJugadores();

            ViewBag.TodosLosJugadores = todosLosJugadores;

            return View(jugador);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var jugadores = _jugadorService.LeerJugadores();
            return Json(jugadores);
        }
    }
}
