using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class OrderResponseDto
{
    public int Id { get; set; }
    public OrderType OrderType { get; set; }
    public OrderStatus Status { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? CafeTableId { get; set; }
    public string? TableNumber { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<OrderItemResponseDto> Items { get; set; } = new();
}