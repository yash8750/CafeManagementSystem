using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class CreateOrderDto
{
    [Required]
    public OrderType OrderType { get; set; } = OrderType.Takeaway;
    public int? CustomerId { get; set; }
    public int? CafeTableId { get; set; }

    [StringLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }

    [Required(ErrorMessage = "At least one order item is required.")]
    [MinLength(1, ErrorMessage = "An order must contain at least one item.")]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}