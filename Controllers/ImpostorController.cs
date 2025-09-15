using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class ImpostorController : Controller
    {
        public IActionResult Lobby()
        {
            return View();
        }
    }
}
