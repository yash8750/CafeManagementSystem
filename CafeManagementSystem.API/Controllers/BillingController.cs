using CafeManagementSystem.Core.DTOs;
using CafeManagementSystem.Core.Enums;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "StaffOnly")]
public class BillingController : ControllerBase
{
    private readonly CafeDbContext _context;
    public BillingController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/billing/orders/1/invoice
    [HttpGet("orders/{orderId:int}/invoice")]
    public async Task<ActionResult<InvoiceResponseDto>> GetInvoice(int orderId)
    {
        var order = await _context.Orders.AsNoTracking()
            .Include(existingOrder => existingOrder.Customer)
            .Include(existingOrder => existingOrder.CafeTable)
            .Include(existingOrder => existingOrder.OrderItems)
                .ThenInclude(item => item.MenuItem)
            .FirstOrDefaultAsync(existingOrder =>existingOrder.Id == orderId);

        if (order is null)
        {
            return NotFound(new{message = $"Order with ID {orderId} was not found."});
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return BadRequest(new{message = "An invoice cannot be generated for a cancelled order."});
        }

        var payments = await _context.Payments.AsNoTracking()
            .Where(payment => payment.OrderId == orderId).OrderByDescending(payment => payment.CreatedAt).ToListAsync();

        // Only completed payments count as money received.
        decimal amountPaid = payments.Where(payment => payment.Status == PaymentStatus.Completed)
            .Sum(payment => payment.Amount);

        // Do not display a negative outstanding balance.
        decimal balanceDue = Math.Max(0m,order.TotalAmount - amountPaid);

        var invoice = new InvoiceResponseDto
        {
            InvoiceNumber = $"INV-{order.Id:D6}",
            OrderId = order.Id,
            OrderType = order.OrderType,
            OrderStatus = order.Status,
            OrderDate = order.CreatedAt,
            CustomerName = order.Customer?.Name,
            TableNumber = order.CafeTable?.TableNumber,

            Items = order.OrderItems.Select(item =>new InvoiceItemDto
                {
                    MenuItemId = item.MenuItemId,
                    MenuItemName = item.MenuItem.Name,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = item.LineTotal
                }).ToList(),

            Subtotal = order.Subtotal,
            TaxAmount = order.TaxAmount,
            TotalAmount = order.TotalAmount,
            AmountPaid = amountPaid,
            BalanceDue = balanceDue,

            Payments = payments.Select(payment =>new InvoicePaymentDto
                {
                    PaymentId = payment.Id,
                    Amount = payment.Amount,
                    PaymentMethod = payment.PaymentMethod,
                    Status = payment.Status,
                    TransactionReference =
                        payment.TransactionReference,
                    PaymentDate = payment.CreatedAt
                }).ToList()
        };
        return Ok(invoice);
    }
}