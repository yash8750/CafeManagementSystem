using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class OrdersController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
