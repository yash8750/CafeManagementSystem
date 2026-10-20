using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class CategoriesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
