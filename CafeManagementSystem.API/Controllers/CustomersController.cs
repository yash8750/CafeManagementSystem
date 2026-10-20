using CafeManagementSystem.Core.DTOs;
using CafeManagementSystem.Core.Entities;
using CafeManagementSystem.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeManagementSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "StaffOnly")]
public class CustomersController : ControllerBase
{
    private readonly CafeDbContext _context;

    public CustomersController(CafeDbContext context)
    {
        _context = context;
    }

    // GET: api/customers
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
    {
        var customers = await _context.Customers.AsNoTracking().OrderBy(customer => customer.Name).ToListAsync();
        return Ok(customers);
    }

    // GET: api/customers/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Customer>> GetCustomer(int id)
    {
        var customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(customer => customer.Id == id);

        if (customer is null)
        {
            return NotFound(new{message = $"Customer with ID {id} was not found."});
        }
        return Ok(customer);
    }

    // POST: api/customers
    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<Customer>> CreateCustomer([FromBody] CreateCustomerDto customerDto)
    {
        string? email = string.IsNullOrWhiteSpace(customerDto.Email)? null: customerDto.Email.Trim();

        string? phoneNumber = string.IsNullOrWhiteSpace(customerDto.PhoneNumber)? null: customerDto.PhoneNumber.Trim();

        bool duplicateEmail = email != null &&await _context.Customers.AnyAsync(customer =>
                customer.Email != null &&customer.Email.ToLower() == email.ToLower());

        if (duplicateEmail)
        {
            return Conflict(new{message = "A customer with this email address already exists."});
        }

        bool duplicatePhone = phoneNumber != null &&await _context.Customers.AnyAsync(customer =>
                customer.PhoneNumber == phoneNumber);

        if (duplicatePhone)
        {
            return Conflict(new{message = "A customer with this phone number already exists."});
        }

        var customer = new Customer
        {
            Name = customerDto.Name.Trim(),
            Email = email,
            PhoneNumber = phoneNumber,
            Address = customerDto.Address?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer),new { id = customer.Id },customer);
    }

    // PUT: api/customers/5
    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> UpdateCustomer(int id,[FromBody] UpdateCustomerDto customerDto)
    {
        var customer = await _context.Customers.FindAsync(id);

        if (customer is null)
        {
            return NotFound(new{message = $"Customer with ID {id} was not found."});
        }

        string? email = string.IsNullOrWhiteSpace(customerDto.Email)? null: customerDto.Email.Trim();

        string? phoneNumber = string.IsNullOrWhiteSpace(customerDto.PhoneNumber)? null: customerDto.PhoneNumber.Trim();

        bool duplicateEmail = email != null &&await _context.Customers.AnyAsync(existing =>
                existing.Id != id &&existing.Email != null &&existing.Email.ToLower() == email.ToLower());

        if (duplicateEmail)
        {
            return Conflict(new{message = "Another customer with this email address already exists."            });
        }

        bool duplicatePhone = phoneNumber != null &&await _context.Customers.AnyAsync(existing =>
                existing.Id != id &&existing.PhoneNumber == phoneNumber);

        if (duplicatePhone)
        {
            return Conflict(new{message = "Another customer with this phone number already exists."});
        }

        customer.Name = customerDto.Name.Trim();
        customer.Email = email;
        customer.PhoneNumber = phoneNumber;
        customer.Address = customerDto.Address?.Trim();
        customer.IsActive = customerDto.IsActive;

        await _context.SaveChangesAsync();
        return Ok(customer);
    }

    // DELETE: api/customers/5
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);

        if (customer is null)
        {
            return NotFound(new{message = $"Customer with ID {id} was not found."});
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/customers/search?term=yash
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<Customer>>> SearchCustomers([FromQuery] string? term)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return BadRequest(new{message = "Please provide a search term."});
        }
            term = term.Trim();

        var customers = await _context.Customers.AsNoTracking().Where(customer =>
                customer.Name.Contains(term) || (customer.Email != null && customer.Email.Contains(term)) ||
                (customer.PhoneNumber != null && customer.PhoneNumber.Contains(term)))
            .OrderBy(customer => customer.Name).ToListAsync();
        return Ok(customers);
    }
}