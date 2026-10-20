using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class InvoicePaymentDto
{
    public int PaymentId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public PaymentStatus Status { get; set; }
    public string? TransactionReference { get; set; }
    public DateTime PaymentDate { get; set; }
}