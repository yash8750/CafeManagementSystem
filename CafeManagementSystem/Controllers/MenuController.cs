using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class MenuController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
