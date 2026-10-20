using Microsoft.AspNetCore.Mvc;

namespace CafeManagementSystem.Controllers
{
    public class PaymentsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
