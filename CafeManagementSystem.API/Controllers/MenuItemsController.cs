using CafeManagementSystem.Core.Entities;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CafeManagementSystem.Core.DTOs;

namespace CafeManagementSystem.API.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = "StaffOnly")]
public class MenuItemsController : ControllerBase
{
    private readonly CafeDbContext _context;

    public MenuItemsController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/MenuItems
    [HttpGet]
    public async Task<IActionResult> GetMenuItems()
    {
        var menuItems = await _context.MenuItems.AsNoTracking().Include(item => item.Category)
            .OrderBy(item => item.Name).Select(item => new
            {
                item.Id,
                item.Name,
                item.Description,
                item.Price,
                item.ImagePath,
                item.IsAvailable,
                item.CategoryId,
                CategoryName = item.Category.Name,
                item.CreatedAt
            }).ToListAsync();

        return Ok(menuItems);
    }
    // POST: api/MenuItems
    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<MenuItem>> CreateMenuItem(CreateMenuItemDto dto)
    {
        var categoryExists = await _context.Categories.AnyAsync(category => category.Id == dto.CategoryId);

        if (!categoryExists)
        {
            return BadRequest(new{message = "The selected category does not exist."});
        }
        var normalizedName = dto.Name.Trim();

        var duplicateExists = await _context.MenuItems.AnyAsync(item =>item.Name.ToLower() == normalizedName.ToLower());

        if (duplicateExists)
        {
            return Conflict(new{message = "A menu item with this name already exists."});
        }

        var menuItem = new MenuItem
        {
            Name = normalizedName,
            Description = dto.Description?.Trim(),
            Price = dto.Price,
            CategoryId = dto.CategoryId,
            IsAvailable = dto.IsAvailable,
            ImagePath = dto.ImagePath?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMenuItems),new { id = menuItem.Id },menuItem);
    }
    // PUT: api/MenuItems/{id}
    [HttpPut("{id}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> UpdateMenuItem(int id,CreateMenuItemDto dto)
    {
        var menuItem = await _context.MenuItems.FirstOrDefaultAsync(item => item.Id == id);

        if (menuItem is null)
        {
            return NotFound(new{message = "Menu item not found."});
        }

        var categoryExists = await _context.Categories.AnyAsync(category => category.Id == dto.CategoryId);

        if (!categoryExists)
        {
            return BadRequest(new{message = "The selected category does not exist."});
        }

        var normalizedName = dto.Name.Trim();

        var duplicateExists = await _context.MenuItems.AnyAsync(item =>
                item.Id != id && item.Name.ToLower() == normalizedName.ToLower());

        if (duplicateExists)
        {
            return Conflict(new{message = "A menu item with this name already exists."});
        }
        menuItem.Name = normalizedName;
        menuItem.Description = dto.Description?.Trim();
        menuItem.Price = dto.Price;
        menuItem.CategoryId = dto.CategoryId;
        menuItem.IsAvailable = dto.IsAvailable;
        menuItem.ImagePath = dto.ImagePath?.Trim();

        await _context.SaveChangesAsync();
        return NoContent();
    }
    // DELETE: api/MenuItems/{id}
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteMenuItem(int id)
    {
        var menuItem = await _context.MenuItems.FirstOrDefaultAsync(item => item.Id == id);

        if (menuItem is null)
        {
            return NotFound(new{message = "Menu item not found."});
        }
        _context.MenuItems.Remove(menuItem);
        await _context.SaveChangesAsync();
        return NoContent();
    }
    // GET: api/MenuItems/search?term=coffee&categoryId=1&isAvailable=true
    [HttpGet("search")]
    public async Task<IActionResult> SearchMenuItems([FromQuery] string? term,[FromQuery] int? categoryId,
        [FromQuery] bool? isAvailable)
    {
        var query = _context.MenuItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(term))
        {
            var searchTerm = term.Trim();

            query = query.Where(item =>item.Name.Contains(searchTerm) ||
                (item.Description != null &&item.Description.Contains(searchTerm)));
        }

        if (categoryId.HasValue)
        {
            query = query.Where(item =>item.CategoryId == categoryId.Value);
        }

        if (isAvailable.HasValue)
        {
            query = query.Where(item =>item.IsAvailable == isAvailable.Value);
        }

        var menuItems = await query.OrderBy(item => item.Name).Select(item => new
            {
                item.Id,
                item.Name,
                item.Description,
                item.Price,
                item.ImagePath,
                item.IsAvailable,
                item.CategoryId,
                CategoryName = item.Category.Name,
                item.CreatedAt
            }).ToListAsync();

        return Ok(menuItems);
    }
}