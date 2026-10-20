using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class KitchenController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
