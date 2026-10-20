using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class CustomersController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
