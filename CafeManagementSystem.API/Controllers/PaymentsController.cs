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
public class PaymentsController : ControllerBase
{
    private readonly CafeDbContext _context;
    public PaymentsController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/payments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetPayments()
    {
        var payments = await _context.Payments.AsNoTracking().OrderByDescending(payment => payment.CreatedAt).ToListAsync();
        return Ok(payments.Select(MapToResponse));
    }

    // GET: api/payments/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PaymentResponseDto>> GetPayment(int id)
    {
        var payment = await _context.Payments.AsNoTracking().FirstOrDefaultAsync(payment => payment.Id == id);

        if (payment is null)
        {
            return NotFound(new{message = $"Payment with ID {id} was not found."});
        }
        return Ok(MapToResponse(payment));
    }

    // POST: api/payments
    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<PaymentResponseDto>> CreatePayment([FromBody] CreatePaymentDto paymentDto)
    {
        if (!Enum.IsDefined(typeof(PaymentMethod),paymentDto.PaymentMethod))
        {
            return BadRequest(new{message = "Please provide a valid payment method."});
        }

        var order = await _context.Orders.Include(existingOrder => existingOrder.OrderItems)
            .FirstOrDefaultAsync(existingOrder =>existingOrder.Id == paymentDto.OrderId);

        if (order is null)
        {
            return NotFound(new{message = $"Order with ID {paymentDto.OrderId} was not found."});
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return BadRequest(new{message = "Payments cannot be created for cancelled orders."});
        }

        if (order.Status != OrderStatus.Completed)
        {
            return BadRequest(new{message = "The order must be completed before payment."});
        }

        if (!string.IsNullOrWhiteSpace(paymentDto.TransactionReference) &&paymentDto.TransactionReference.Length > 100)
        {
            return BadRequest(new{message = "Transaction reference cannot exceed 100 characters."});
        }

        if (!string.IsNullOrWhiteSpace(paymentDto.Notes) &&paymentDto.Notes.Length > 500)
        {
            return BadRequest(new{message = "Payment notes cannot exceed 500 characters."});
        }

        var existingPayments = await _context.Payments.Where(payment => payment.OrderId == order.Id).ToListAsync();

        if (existingPayments.Any(payment =>payment.Status == PaymentStatus.Pending))
        {
            return Conflict(new{message = "This order already has a pending payment."});
        }

        if (existingPayments.Any(payment =>payment.Status == PaymentStatus.Completed))
        {
            return Conflict(new{message = "This order already has a completed payment."});
        }

        var payment = new Payment
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            PaymentMethod = paymentDto.PaymentMethod,
            Status = PaymentStatus.Pending,
            TransactionReference =paymentDto.TransactionReference?.Trim(),
            Notes = paymentDto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPayment),new { id = payment.Id },MapToResponse(payment));
    }

    // PATCH: api/payments/5/status
    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<PaymentResponseDto>> UpdatePaymentStatus(int id,[FromBody] UpdatePaymentStatusDto statusDto)
    {
        if (!Enum.IsDefined(typeof(PaymentStatus),statusDto.Status))
        {
            return BadRequest(new{message = "Please provide a valid payment status."});
        }

        var payment = await _context.Payments.FirstOrDefaultAsync(existingPayment =>existingPayment.Id == id);

        if (payment is null)
        {
            return NotFound(new{message = $"Payment with ID {id} was not found."});
        }

        bool validTransition = payment.Status switch
        {
            PaymentStatus.Pending =>statusDto.Status == PaymentStatus.Completed ||statusDto.Status == PaymentStatus.Failed,
            PaymentStatus.Completed =>statusDto.Status == PaymentStatus.Refunded,_ => false
        };

        if (!validTransition)
        {
            return Conflict(new{message =$"Cannot change payment status from " +$"{payment.Status} to {statusDto.Status}."});
        }
        payment.Status = statusDto.Status;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(MapToResponse(payment));
    }

    private static PaymentResponseDto MapToResponse(Payment payment)
    {
        return new PaymentResponseDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            Status = payment.Status,
            TransactionReference = payment.TransactionReference,
            Notes = payment.Notes,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}