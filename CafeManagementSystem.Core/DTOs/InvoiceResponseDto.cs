using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class InvoiceResponseDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public OrderType OrderType { get; set; }
    public OrderStatus OrderStatus { get; set; }
    public DateTime OrderDate { get; set; }
    public string? CustomerName { get; set; }
    public string? TableNumber { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public List<InvoicePaymentDto> Payments { get; set; } = new();
}