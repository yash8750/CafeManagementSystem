using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class CreateTableDto
{
    [Required(ErrorMessage = "Table number is required.")]
    [StringLength(20, MinimumLength = 1,ErrorMessage = "Table number must be between 1 and 20 characters.")]
    public string TableNumber { get; set; } = string.Empty;

    [Range(1, 50,ErrorMessage = "Table capacity must be between 1 and 50.")]
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Available;
    public bool IsActive { get; set; } = true;
}