using System.ComponentModel.DataAnnotations;
using CafeManagementSystem.Core.Enums;

namespace CafeManagementSystem.Core.DTOs;
public class UpdateOrderStatusDto
{
    [Required]
    [EnumDataType(typeof(OrderStatus),ErrorMessage = "Please provide a valid order status.")]
    public OrderStatus Status { get; set; }
}