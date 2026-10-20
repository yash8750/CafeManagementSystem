using CafeManagementSystem.Core.Enums;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagerOrAdmin")]
public class ReportsController : ControllerBase
{
    private readonly CafeDbContext _context;

    public ReportsController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/Reports/dashboard
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalOrders = await _context.Orders
            .CountAsync();

        var completedOrders = await _context.Orders
            .CountAsync(order => order.Status == OrderStatus.Completed);

        var pendingOrders = await _context.Orders
            .CountAsync(order => order.Status == OrderStatus.Pending);

        var cancelledOrders = await _context.Orders
            .CountAsync(order => order.Status == OrderStatus.Cancelled);

        // Total Sales:
        // Total value of orders currently marked Completed.
        // TotalAmount includes the applicable order taxes.
        var totalSales = await _context.Orders
            .Where(order => order.Status == OrderStatus.Completed)
            .SumAsync(order => (decimal?)order.TotalAmount) ?? 0m;

        // Total Revenue:
        // Payments currently marked Completed.
        // Refunded, Pending and Failed payments are excluded.
        var totalRevenue = await _context.Payments
            .Where(payment => payment.Status == PaymentStatus.Completed)
            .SumAsync(payment => (decimal?)payment.Amount) ?? 0m;

        return Ok(new
        {
            totalOrders,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            totalSales,
            totalRevenue
        });
    }

    // GET: api/Reports/daily?date=2026-10-16
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyReport(
        [FromQuery] DateTime? date)
    {
        var selectedDate = (date ?? DateTime.Today).Date;

        DateTime nextDate;

        try
        {
            nextDate = selectedDate.AddDays(1);
        }
        catch (ArgumentOutOfRangeException)
        {
            return BadRequest(new
            {
                message = "The selected date is outside the supported range."
            });
        }

        // Orders created on the selected date.
        var orders = await _context.Orders
            .AsNoTracking()
            .Where(order =>
                order.CreatedAt >= selectedDate &&
                order.CreatedAt < nextDate)
            .ToListAsync();

        var completedOrders = orders
            .Where(order => order.Status == OrderStatus.Completed)
            .ToList();

        var cancelledOrders = orders
            .Count(order => order.Status == OrderStatus.Cancelled);

        var totalSales = completedOrders
            .Sum(order => order.TotalAmount);

        // Payments created on the selected date that are
        // currently marked Completed.
        var totalRevenue = await _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Status == PaymentStatus.Completed &&
                payment.CreatedAt >= selectedDate &&
                payment.CreatedAt < nextDate)
            .SumAsync(payment => (decimal?)payment.Amount) ?? 0m;

        return Ok(new
        {
            date = selectedDate.ToString("yyyy-MM-dd"),
            totalOrders = orders.Count,
            completedOrders = completedOrders.Count,
            cancelledOrders,
            totalSales,
            totalRevenue
        });
    }

    // GET: api/Reports/monthly?year=2026&month=10
    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyReport(
        [FromQuery] int year,
        [FromQuery] int month)
    {
        if (year < 2000 || year > 9999)
        {
            return BadRequest(new
            {
                message = "Please provide a valid year between 2000 and 9999."
            });
        }

        if (month < 1 || month > 12)
        {
            return BadRequest(new
            {
                message = "Month must be between 1 and 12."
            });
        }

        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1);

        // Orders created during the selected month.
        var orders = await _context.Orders
            .AsNoTracking()
            .Where(order =>
                order.CreatedAt >= startDate &&
                order.CreatedAt < endDate)
            .ToListAsync();

        var completedOrders = orders
            .Where(order => order.Status == OrderStatus.Completed)
            .ToList();

        var cancelledOrders = orders
            .Count(order => order.Status == OrderStatus.Cancelled);

        var totalSales = completedOrders
            .Sum(order => order.TotalAmount);

        // Payments created during the selected month that are
        // currently marked Completed.
        var totalRevenue = await _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Status == PaymentStatus.Completed &&
                payment.CreatedAt >= startDate &&
                payment.CreatedAt < endDate)
            .SumAsync(payment => (decimal?)payment.Amount) ?? 0m;

        return Ok(new
        {
            year,
            month,
            totalOrders = orders.Count,
            completedOrders = completedOrders.Count,
            cancelledOrders,
            totalSales,
            totalRevenue
        });
    }
}
