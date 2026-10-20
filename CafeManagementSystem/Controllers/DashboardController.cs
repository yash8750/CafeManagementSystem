using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class DashboardController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}