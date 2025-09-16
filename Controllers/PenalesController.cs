using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class PenalesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Sala(string codigo)
        {
            ViewBag.CodigoSala = codigo;
            return View();
        }
        
    }
}
