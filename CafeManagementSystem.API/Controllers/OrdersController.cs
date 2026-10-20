using CafeManagementSystem.Core.DTOs;
using CafeManagementSystem.Core.Entities;
using CafeManagementSystem.Core.Enums;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "StaffOnly")]
public class OrdersController : ControllerBase
{
    private readonly CafeDbContext _context;
    public OrdersController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/orders
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderResponseDto>>> GetOrders()
    {
        var orders = await _context.Orders.AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.CafeTable)
            .Include(order => order.OrderItems)
                .ThenInclude(item => item.MenuItem)
            .OrderByDescending(order => order.CreatedAt).ToListAsync();

        return Ok(orders.Select(MapToResponse));
    }

    // GET: api/orders/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderResponseDto>> GetOrder(int id)
    {
        var order = await GetOrderWithDetails(id);

        if (order is null)
        {
            return NotFound(new { message = $"Order with ID {id} was not found." });
        }
        return Ok(MapToResponse(order));
    }

    // POST: api/orders
    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<OrderResponseDto>> CreateOrder([FromBody] CreateOrderDto orderDto)
    {
        if (!Enum.IsDefined(typeof(OrderType), orderDto.OrderType))
        {
            return BadRequest(new { message = "Please provide a valid order type." });
        }

        if (orderDto.Items is null || orderDto.Items.Count == 0)
        {
            return BadRequest(new { message = "An order must contain at least one item." });
        }

        if (orderDto.Items.Any(item => item.Quantity < 1 || item.Quantity > 1000))
        {
            return BadRequest(new { message = "Each item quantity must be between 1 and 1000." });
        }

        if (orderDto.Items.Any(item => item.MenuItemId <= 0))
        {
            return BadRequest(new { message = "Every menu item must have a valid ID." });
        }

        if (orderDto.CustomerId.HasValue)
        {
            bool customerExists = await _context.Customers.AnyAsync(customer =>
                    customer.Id == orderDto.CustomerId.Value && customer.IsActive);

            if (!customerExists)
            {
                return BadRequest(new { message = "The selected customer does not exist or is inactive." });
            }
        }
        CafeTable? cafeTable = null;

        if (orderDto.OrderType == OrderType.DineIn)
        {
            if (!orderDto.CafeTableId.HasValue)
            {
                return BadRequest(new { message = "A table is required for dine-in orders." });
            }

            cafeTable = await _context.CafeTables.FirstOrDefaultAsync(table =>
                    table.Id == orderDto.CafeTableId.Value);

            if (cafeTable is null || !cafeTable.IsActive)
            {
                return BadRequest(new { message = "The selected table does not exist or is inactive." });
            }

            if (cafeTable.Status != TableStatus.Available)
            {
                return Conflict(new { message = "The selected table is not available." });
            }
        }
        else if (orderDto.CafeTableId.HasValue)
        {
            return BadRequest(new { message = "Takeaway orders cannot be assigned to a cafe table." });
        }

        if (!string.IsNullOrWhiteSpace(orderDto.Notes) && orderDto.Notes.Length > 500)
        {
            return BadRequest(new { message = "Notes cannot exceed 500 characters." });
        }

        var requestedMenuItemIds = orderDto.Items.Select(item => item.MenuItemId).Distinct().ToList();

        var menuItems = await _context.MenuItems.Where(item => requestedMenuItemIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id);

        if (menuItems.Count != requestedMenuItemIds.Count)
        {
            return BadRequest(new { message = "One or more selected menu items do not exist." });
        }

        foreach (var menuItem in menuItems.Values)
        {
            if (!menuItem.IsAvailable)
            {
                return BadRequest(new { message = $"Menu item '{menuItem.Name}' is unavailable." });
            }
        }

        var order = new Order
        {
            OrderType = orderDto.OrderType,
            Status = OrderStatus.Pending,
            CustomerId = orderDto.CustomerId,
            CafeTableId = cafeTable?.Id,
            Notes = orderDto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        foreach (var requestedItem in orderDto.Items)
        {
            var menuItem = menuItems[requestedItem.MenuItemId];
            decimal lineTotal = menuItem.Price * requestedItem.Quantity;
            order.OrderItems.Add(new OrderItem
            {
                MenuItemId = menuItem.Id,
                Quantity = requestedItem.Quantity,
                UnitPrice = menuItem.Price,
                LineTotal = lineTotal
            });
        }

        order.Subtotal = order.OrderItems.Sum(item => item.LineTotal);

        // Tax rate is configurable in the application.
        // Initial example rate: 5%.
        const decimal taxRate = 0.05m;

        order.TaxAmount = Math.Round(order.Subtotal * taxRate, 2, MidpointRounding.AwayFromZero);
        order.TotalAmount = order.Subtotal + order.TaxAmount;

        if (cafeTable is not null)
        {
            cafeTable.Status = TableStatus.Occupied;
        }
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        var createdOrder = await GetOrderWithDetails(order.Id);

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, MapToResponse(createdOrder!));
    }

    // PATCH: api/orders/5/status
    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<OrderResponseDto>> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto statusDto)
    {
        if (!Enum.IsDefined(typeof(OrderStatus), statusDto.Status))
        {
            return BadRequest(new { message = "Please provide a valid order status." });
        }

        var order = await _context.Orders.Include(existingOrder => existingOrder.CafeTable)
            .FirstOrDefaultAsync(existingOrder => existingOrder.Id == id);

        if (order is null)
        {
            return NotFound(new { message = $"Order with ID {id} was not found." });
        }

        if (order.Status == OrderStatus.Completed || order.Status == OrderStatus.Cancelled)
        {
            return Conflict(new { message = "Completed or cancelled orders cannot change status." });
        }

        bool validTransition = order.Status switch
        {
            OrderStatus.Pending => statusDto.Status == OrderStatus.Confirmed || statusDto.Status == OrderStatus.Cancelled,
            OrderStatus.Confirmed => statusDto.Status == OrderStatus.Preparing || statusDto.Status == OrderStatus.Cancelled,
            OrderStatus.Preparing => statusDto.Status == OrderStatus.Ready || statusDto.Status == OrderStatus.Cancelled,
            OrderStatus.Ready => statusDto.Status == OrderStatus.Completed,
            _ => false
        };

        if (!validTransition)
        {
            return BadRequest(new { message = $"Cannot change order status from {order.Status} to {statusDto.Status}." });
        }
        order.Status = statusDto.Status;
        order.UpdatedAt = DateTime.UtcNow;

        if (statusDto.Status == OrderStatus.Completed ||
            statusDto.Status == OrderStatus.Cancelled)
        {
            await ReleaseTableIfNoActiveOrdersAsync(
                order.Id,order.CafeTable);
        }
        await _context.SaveChangesAsync();
        var updatedOrder = await GetOrderWithDetails(order.Id);
        return Ok(MapToResponse(updatedOrder!));
    }

    // POST: api/orders/5/cancel
    [HttpPost("{id:int}/cancel")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<OrderResponseDto>> CancelOrder(int id)
    {
        var order = await _context.Orders.Include(existingOrder => existingOrder.CafeTable)
            .FirstOrDefaultAsync(existingOrder => existingOrder.Id == id);

        if (order is null)
        {
            return NotFound(new { message = $"Order with ID {id} was not found." });
        }

        if (order.Status == OrderStatus.Completed || order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.Ready)
        {
            return Conflict(new { message = "This order cannot be cancelled in its current status." });
        }

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;

        await ReleaseTableIfNoActiveOrdersAsync(order.Id,order.CafeTable);
        await _context.SaveChangesAsync();
        var cancelledOrder = await GetOrderWithDetails(order.Id);
        return Ok(MapToResponse(cancelledOrder!));
    }
    
    private async Task ReleaseTableIfNoActiveOrdersAsync(int orderId,CafeTable? cafeTable)
    {
        if (cafeTable is null)
        {
            return;
        }

        bool hasOtherActiveOrders = await _context.Orders
            .AnyAsync(order =>
                order.CafeTableId == cafeTable.Id &&
                order.Id != orderId &&
                order.Status != OrderStatus.Completed &&
                order.Status != OrderStatus.Cancelled);

        if (!hasOtherActiveOrders)
        {
            cafeTable.Status = TableStatus.Available;
        }
    }

    // GET: api/orders/search?term=1
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<OrderResponseDto>>> SearchOrders([FromQuery] string? term)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return BadRequest(new { message = "Please provide a search term." });
        }
        term = term.Trim();

        var orders = await _context.Orders.AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.CafeTable)
            .Include(order => order.OrderItems)
                .ThenInclude(item => item.MenuItem)
          .Where(order =>
    order.Id.ToString() == term ||
    (order.Customer != null &&
     order.Customer.Name.Contains(term)) ||
    (order.Customer != null &&
     order.Customer.Email != null &&
     order.Customer.Email.Contains(term)) ||
    order.OrderItems.Any(item =>
        item.MenuItem.Name.Contains(term)))
            .OrderByDescending(order => order.CreatedAt).ToListAsync();

        return Ok(orders.Select(MapToResponse));
    }

    private async Task<Order?> GetOrderWithDetails(int id)
    {
        return await _context.Orders.AsNoTracking()
            .Include(order => order.Customer)
            .Include(order => order.CafeTable)
            .Include(order => order.OrderItems)
                .ThenInclude(item => item.MenuItem)
            .FirstOrDefaultAsync(order => order.Id == id);
    }

    private static OrderResponseDto MapToResponse(Order order)
    {
        return new OrderResponseDto
        {
            Id = order.Id,
            OrderType = order.OrderType,
            Status = order.Status,
            CustomerId = order.CustomerId,
            CustomerName = order.Customer?.Name,
            CafeTableId = order.CafeTableId,
            TableNumber = order.CafeTable?.TableNumber,
            Subtotal = order.Subtotal,
            TaxAmount = order.TaxAmount,
            TotalAmount = order.TotalAmount,
            Notes = order.Notes,
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt,

            Items = order.OrderItems.Select(item => new OrderItemResponseDto
            {
                Id = item.Id,
                MenuItemId = item.MenuItemId,
                MenuItemName = item.MenuItem.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = item.LineTotal
            }).ToList()
        };
    }
}