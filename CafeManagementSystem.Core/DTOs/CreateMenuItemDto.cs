using System.ComponentModel.DataAnnotations;

namespace CafeManagementSystem.Core.DTOs;
public class CreateMenuItemDto
{
    [Required(ErrorMessage = "Menu item name is required.")]
    [StringLength(150, MinimumLength = 2,ErrorMessage = "Name must be between 2 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000,ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Range(0.01, 100000,ErrorMessage = "Price must be between 0.01 and 100000.")]
    public decimal Price { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [Range(1, int.MaxValue,ErrorMessage = "Please select a valid category.")]
    public int CategoryId { get; set; }

    public bool IsAvailable { get; set; } = true;

    [StringLength(500,ErrorMessage = "Image path cannot exceed 500 characters.")]
    public string? ImagePath { get; set; }
}