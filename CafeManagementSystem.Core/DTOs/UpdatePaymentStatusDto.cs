using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class UpdatePaymentStatusDto
{
    [Required]
    public PaymentStatus Status { get; set; }
}