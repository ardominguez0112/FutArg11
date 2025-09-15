
using FutArg11.Models;
using FutArg11.Services;
using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class FutArgGridController : Controller
    {
        public IActionResult Index()
        {
            //var service = new JugadorService(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "players.csv"));
            //var jugadores = service.ObtenerJugadores();
            return View(/*jugadores*/);
        }
    }
}
