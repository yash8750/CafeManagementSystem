using CafeManagementSystem.Core.DTOs;
using CafeManagementSystem.Core.Entities;
using CafeManagementSystem.Core.Enums;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = "StaffOnly")]
public class TablesController : ControllerBase
{
    private readonly CafeDbContext _context;

    public TablesController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/Tables
    [HttpGet]
        public async Task<IActionResult> GetTables()
        {
            var tables = await _context.CafeTables.AsNoTracking().OrderBy(table => table.TableNumber).Select(table => new
                {
                    table.Id,
                    table.TableNumber,
                    table.Capacity,
                    table.Status,
                    table.IsActive,
                    table.CreatedAt
                }).ToListAsync();

            return Ok(tables);
        }

    // GET: api/Tables/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTable(int id)
    {
        var table = await _context.CafeTables.AsNoTracking().Where(table => table.Id == id).Select(table => new
            {
                table.Id,
                table.TableNumber,
                table.Capacity,
                table.Status,
                table.IsActive,
                table.CreatedAt
            }).FirstOrDefaultAsync();

        if (table is null)
        {
            return NotFound(new{message = "Table not found."});
        }

        return Ok(table);
    }
// POST: api/Tables
[HttpPost]
public async Task<IActionResult> CreateTable(
    [FromBody] CreateTableDto dto)
    {
        // Check whether the table number already exists.
        var tableExists = await _context.CafeTables
            .AnyAsync(table => table.TableNumber == dto.TableNumber);

        if (tableExists)
        {
            return Conflict(new
            {
                message = "A table with this table number already exists."
            });
        }

        // Create the table entity.
        var table = new CafeTable
        {
            TableNumber = dto.TableNumber.Trim(),
            Capacity = dto.Capacity,
            Status = dto.Status,
            IsActive = dto.IsActive
        };

        // Save the table to the database.
        _context.CafeTables.Add(table);
        await _context.SaveChangesAsync();

        // Return the created table.
        return CreatedAtAction(
            nameof(GetTable),
            new { id = table.Id },
            new
            {
                table.Id,
                table.TableNumber,
                table.Capacity,
                table.Status,
                table.IsActive,
                table.CreatedAt
            });
    }
    // PUT: api/Tables/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTable(int id,[FromBody] UpdateTableDto dto)
    {
        // Find the existing table.
        var table = await _context.CafeTables.FirstOrDefaultAsync(table => table.Id == id);

        if (table is null)
        {
            return NotFound(new{message = "Table not found."});
        }

        // Normalize the table number.
        var tableNumber = dto.TableNumber.Trim();

        // Check whether another table uses the same number.
        var tableNumberExists = await _context.CafeTables
            .AnyAsync(existingTable =>existingTable.TableNumber == tableNumber &&existingTable.Id != id);

        if (tableNumberExists)
        {
            return Conflict(new{message = "Another table with this table number already exists."});
        }
        // Update the table properties.
        table.TableNumber = tableNumber;
        table.Capacity = dto.Capacity;
        table.Status = dto.Status;
        table.IsActive = dto.IsActive;

        // Save changes to SQL Server.
        await _context.SaveChangesAsync();

        return Ok(new{
            message = "Table updated successfully.",
            table.Id,
            table.TableNumber,
            table.Capacity,
            table.Status,
            table.IsActive,
            table.CreatedAt
        });
    }
    // DELETE: api/Tables/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTable(int id)
    {
        // Find the table.
        var table = await _context.CafeTables
            .FirstOrDefaultAsync(table => table.Id == id);

        // Return 404 if the table does not exist.
        if (table is null)
        {
            return NotFound(new
            {
                message = "Table not found."
            });
        }

        // Prevent deletion if the table is occupied, reserved, or being cleaned.
        if (table.Status != TableStatus.Available &&
            table.Status != TableStatus.Inactive)
        {
            return Conflict(new
            {
                message = "This table cannot be deleted because it is not available."
            });
        }

        // Check whether the table has an active order.
        var hasActiveOrders = await _context.Orders
            .AnyAsync(order =>
                order.CafeTableId == id &&
                (order.Status == OrderStatus.Pending ||
                 order.Status == OrderStatus.Confirmed ||
                 order.Status == OrderStatus.Preparing ||
                 order.Status == OrderStatus.Ready));

        // Prevent deletion if an active order exists.
        if (hasActiveOrders)
        {
            return Conflict(new
            {
                message = "This table cannot be deleted because it has active orders."
            });
        }

        // Delete the table.
        _context.CafeTables.Remove(table);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Table deleted successfully.",
            table.Id,
            table.TableNumber
        });
    }

    // GET: api/Tables/search
    [HttpGet("search")]
    public async Task<IActionResult> SearchTables(
        [FromQuery] string? term,[FromQuery] int? minCapacity,[FromQuery] TableStatus? status,[FromQuery] bool? isActive)
    {
        // Start with all tables.
        var query = _context.CafeTables.AsNoTracking().AsQueryable();

        // Search by table number.
        if (!string.IsNullOrWhiteSpace(term))
        {
            var searchTerm = term.Trim();

            query = query.Where(table =>table.TableNumber.Contains(searchTerm));
        }

        // Filter by minimum capacity.
        if (minCapacity.HasValue)
        {
            if (minCapacity.Value < 1 || minCapacity.Value > 50)
            {
                return BadRequest(new{message = "Minimum capacity must be between 1 and 50."});
            }

            query = query.Where(table =>table.Capacity >= minCapacity.Value);
        }

        // Filter by table status.
        if (status.HasValue)
        {
            if (!Enum.IsDefined(typeof(TableStatus), status.Value))
            {
                return BadRequest(new{message = "Invalid table status."});
            }

            query = query.Where(table =>table.Status == status.Value);
        }

        // Filter by active/inactive status.
        if (isActive.HasValue)
        {
            query = query.Where(table =>table.IsActive == isActive.Value);
        }

        // Execute the query and return the results.
        var tables = await query.OrderBy(table => table.TableNumber).Select(table => new
            {
                table.Id,
                table.TableNumber,
                table.Capacity,
                table.Status,
                table.IsActive,
                table.CreatedAt
            }).ToListAsync();
        return Ok(tables);
    }
}