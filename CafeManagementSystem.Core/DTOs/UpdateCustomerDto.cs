using System.ComponentModel.DataAnnotations;

namespace CafeManagementSystem.Core.DTOs;
public class UpdateCustomerDto
{
    [Required(ErrorMessage = "Customer name is required.")]
    [StringLength(100, MinimumLength = 2,ErrorMessage = "Customer name must be between 2 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    [StringLength(150)]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Please enter a valid phone number.")]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }
    public bool IsActive { get; set; }
}