using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.Entities;
public class Order
{
    public int Id { get; set; }

    [Required]
    public OrderType OrderType { get; set; } = OrderType.Takeaway;

    [Required]
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    public int? CafeTableId { get; set; }

    public CafeTable? CafeTable { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    [Range(0, 10000000)]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    [Range(0, 10000000)]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    [Range(0, 10000000)]
    public decimal TotalAmount { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; }= new List<OrderItem>();
}