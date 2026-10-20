using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class ReportsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
