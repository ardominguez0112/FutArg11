using Microsoft.AspNetCore.Mvc;

namespace FutArg11.Controllers
{
    public class FutArgTop10Controller : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
