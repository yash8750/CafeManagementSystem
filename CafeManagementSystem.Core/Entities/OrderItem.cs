using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CafeManagementSystem.Core.Entities;
public class OrderItem
{
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }

    public Order Order { get; set; } = null!;

    [Required]
    public int MenuItemId { get; set; }

    public MenuItem MenuItem { get; set; } = null!;

    [Range(1, 1000)]
    public int Quantity { get; set; } = 1;

    [Column(TypeName = "decimal(18,2)")]
    [Range(0.01, 100000)]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    [Range(0.01, 100000000)]
    public decimal LineTotal { get; set; }
}