using Microsoft.AspNetCore.Mvc;
using CafeManagementSystem.Models;

namespace CafeManagementSystem.Controllers
{
    public class AccountController : Controller
    {   
        [HttpGet]
        public IActionResult Login()
        {
            return View(new LoginViewModel());
        }
    }
}
