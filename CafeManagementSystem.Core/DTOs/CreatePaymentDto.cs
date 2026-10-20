using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class CreatePaymentDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int OrderId { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; }

    [StringLength(100)]
    public string? TransactionReference { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}