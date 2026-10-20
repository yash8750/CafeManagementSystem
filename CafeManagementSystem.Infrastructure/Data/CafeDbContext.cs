using CafeManagementSystem.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using CafeManagementSystem.Infrastructure.Identity;

namespace CafeManagementSystem.Infrastructure.Data;
public class CafeDbContext : IdentityDbContext<ApplicationUser>
{
    public CafeDbContext(DbContextOptions<CafeDbContext> options): base(options)
    {
    }
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<CafeTable> CafeTables => Set<CafeTable>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
}