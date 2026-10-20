using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.Entities;
public class CafeTable
{
    public int Id { get; set; }

    [Required]
    [StringLength(20)]
    public string TableNumber { get; set; } = string.Empty;

    [Range(1, 50)]
    public int Capacity { get; set; } = 4;

    public TableStatus Status { get; set; } = TableStatus.Available;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}