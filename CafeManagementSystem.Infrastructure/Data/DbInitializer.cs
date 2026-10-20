using CafeManagementSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace CafeManagementSystem.Infrastructure.Data;
public static class DbInitializer
{
    public static async Task SeedAdminAsync(UserManager<ApplicationUser> userManager,IConfiguration configuration)
    {
        var email = configuration["AdminUser:Email"];
        var password = configuration["AdminUser:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Admin credentials are missing from User Secrets.");
        }

        var existingUser = await userManager.FindByEmailAsync(email);

        if (existingUser is not null)
        {
            return;
        }

        var admin = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = "System Administrator",
            IsActive = true
        };

        var result = await userManager.CreateAsync(admin, password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ",result.Errors.Select(error => error.Description));

            throw new InvalidOperationException($"Failed to create Admin account: {errors}");
        }

        var roleResult = await userManager.AddToRoleAsync(admin, "Admin");

        if (!roleResult.Succeeded)
        {
            var errors = string.Join(", ",roleResult.Errors.Select(error => error.Description));

            throw new InvalidOperationException($"Failed to assign Admin role: {errors}");
        }
    }
    public static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        string[] roles =["Admin","Manager","Cashier","Kitchen Staff","Customer"];

        foreach (string role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var result = await roleManager.CreateAsync(new IdentityRole(role));

                if (!result.Succeeded)
                {
                    string errors = string.Join(", ",result.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Failed to create role '{role}': {errors}");
                }
            }
        }
    }
}