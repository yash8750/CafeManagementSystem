using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.Entities;
public class Payment
{
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    [Range(0.01, 100000000)]
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    [StringLength(100)]
    public string? TransactionReference { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}