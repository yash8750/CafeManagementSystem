using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class TablesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
