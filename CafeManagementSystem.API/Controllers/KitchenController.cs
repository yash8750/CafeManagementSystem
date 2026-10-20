using CafeManagementSystem.Core.Enums;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "StaffOnly")]
public class KitchenController : ControllerBase
{
    private readonly CafeDbContext _context;
    public KitchenController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/kitchen/orders
    [HttpGet("orders")]
    public async Task<IActionResult> GetKitchenOrders()
    {
        var orders = await _context.Orders.AsNoTracking().Include(order => order.OrderItems).ThenInclude(item => item.MenuItem)
            .Where(order =>order.Status == OrderStatus.Confirmed || order.Status == OrderStatus.Preparing ||
                order.Status == OrderStatus.Ready).OrderBy(order => order.CreatedAt)
            .Select(order => new
            {
                order.Id,
                order.OrderType,
                order.Status,
                order.CreatedAt,
                order.Notes,
                Items = order.OrderItems.Select(item => new
                {
                    item.MenuItemId,MenuItemName = item.MenuItem.Name,item.Quantity
                })}).ToListAsync();
        return Ok(orders);
    }

    // GET: api/kitchen/orders/1
    [HttpGet("orders/{id:int}")]
    public async Task<IActionResult> GetKitchenOrder(int id)
    {
        var order = await _context.Orders.AsNoTracking()
            .Include(existingOrder => existingOrder.OrderItems).ThenInclude(item => item.MenuItem)
            .Where(existingOrder => existingOrder.Id == id &&(existingOrder.Status == OrderStatus.Confirmed ||
                 existingOrder.Status == OrderStatus.Preparing || existingOrder.Status == OrderStatus.Ready))
            .Select(existingOrder => new
            {
                existingOrder.Id,
                existingOrder.OrderType,
                existingOrder.Status,
                existingOrder.CreatedAt,
                existingOrder.Notes,
                Items = existingOrder.OrderItems.Select(item => new{
                    item.MenuItemId,MenuItemName = item.MenuItem.Name,item.Quantity
                })}).FirstOrDefaultAsync();

        if (order is null)
        {
            return NotFound(new{message = $"Active kitchen order with ID {id} was not found."});
        }
        return Ok(order);
    }
}