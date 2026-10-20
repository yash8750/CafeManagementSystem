using CafeManagementSystem.Core.Entities;
using CafeManagementSystem.Core.DTOs;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace CafeManagementSystem.API.Controllers;
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly CafeDbContext _context;
    public CategoriesController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/categories
    [HttpGet]
    [Authorize(Policy = "StaffOnly")]   
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        var categories = await _context.Categories.AsNoTracking().OrderBy(category => category.Name).ToListAsync();
        return Ok(categories);
    }

    // GET: api/categories/5
    [HttpGet("{id:int}")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<ActionResult<Category>> GetCategory(int id)
    {
        var category = await _context.Categories.AsNoTracking().FirstOrDefaultAsync(category => category.Id == id);
        if (category is null)
        {
            return NotFound(new{message = $"Category with ID {id} was not found."});
        }
        return Ok(category);
    }

    // POST: api/categories
    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<Category>> CreateCategory([FromBody] CreateCategoryDto categoryDto)
    {
        string categoryName = categoryDto.Name.Trim();

        bool nameExists = await _context.Categories.AnyAsync(category =>category.Name.ToLower() == categoryName.ToLower());

        if (nameExists)
        {
            return Conflict(new{message = "A category with this name already exists."});
        }
        var category = new Category
        {
            Name = categoryName,
            Description = categoryDto.Description?.Trim(),
            IsActive = categoryDto.IsActive,
            CreatedAt = DateTime.UtcNow
        };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCategory),new { id = category.Id },category);
    }

    // PUT: api/categories/5
    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> UpdateCategory(int id,[FromBody] UpdateCategoryDto categoryDto)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category is null)
        {
            return NotFound(new{message = $"Category with ID {id} was not found."});
        }
        string categoryName = categoryDto.Name.Trim();

        bool nameExists = await _context.Categories.AnyAsync(existing =>
            existing.Id != id && existing.Name.ToLower() == categoryName.ToLower());

        if (nameExists)
        {
            return Conflict(new{message = "Another category with this name already exists."});
        }
        category.Name = categoryName;
        category.Description = categoryDto.Description?.Trim();
        category.IsActive = categoryDto.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/categories/5
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category is null)
        {
            return NotFound(new{message = $"Category with ID {id} was not found."});
        }

        bool hasMenuItems = await _context.MenuItems.AnyAsync(menuItem => menuItem.CategoryId == id);

        if (hasMenuItems)
        {
            return Conflict(new{message ="This category cannot be deleted because menu items are assigned to it."});
        }
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/categories/search?term=coffee
    [HttpGet("search")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<ActionResult<IEnumerable<Category>>> SearchCategories([FromQuery] string? term)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return BadRequest(new{message = "Please provide a search term."});
        }
        term = term.Trim();
        
        var categories = await _context.Categories.AsNoTracking().Where(category => category.Name.Contains(term))
            .OrderBy(category => category.Name).ToListAsync();
        return Ok(categories);
    }
}