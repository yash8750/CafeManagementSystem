using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class BillingController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
