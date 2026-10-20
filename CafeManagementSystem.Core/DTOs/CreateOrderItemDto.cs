using System.ComponentModel.DataAnnotations;

namespace CafeManagementSystem.Core.DTOs;
public class CreateOrderItemDto
{
    [Required(ErrorMessage = "Menu item ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Please select a valid menu item.")]
    public int MenuItemId { get; set; }

    [Range(1, 1000, ErrorMessage = "Quantity must be between 1 and 1000.")]
    public int Quantity { get; set; } = 1;
}