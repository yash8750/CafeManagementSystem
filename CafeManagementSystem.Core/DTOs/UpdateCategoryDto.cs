using System.ComponentModel.DataAnnotations;

namespace CafeManagementSystem.Core.DTOs;

public class UpdateCategoryDto
{
    [Required(ErrorMessage = "Category name is required.")]
    [StringLength(100, MinimumLength = 2,
        ErrorMessage = "Category name must be between 2 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500,
        ErrorMessage = "Description cannot exceed 500 characters.")]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}