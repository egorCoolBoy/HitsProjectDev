using BackHits.Contracts;
using BackHits.Extensions;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackHits.Controllers;

[ApiController]
[Authorize]
[Route("orders/{orderId:long}/expenses")]
public sealed class OrderExpensesController : ControllerBase
{
    private readonly IOrderExpenseService _orderExpenseService;

    public OrderExpensesController(IOrderExpenseService orderExpenseService)
    {
        _orderExpenseService = orderExpenseService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderExpenseResponse>>> GetAll(long orderId)
    {
        try
        {
            var expenses = await _orderExpenseService.GetAllAsync(User.GetUserId(), orderId);
            return Ok(expenses);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpGet("{expenseId:long}")]
    public async Task<ActionResult<OrderExpenseResponse>> GetById(long orderId, long expenseId)
    {
        try
        {
            var expense = await _orderExpenseService.GetByIdAsync(User.GetUserId(), orderId, expenseId);
            return Ok(expense);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderExpenseNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<OrderExpenseResponse>> Create(long orderId, [FromBody] CreateOrderExpenseRequest request)
    {
        try
        {
            var expense = await _orderExpenseService.CreateAsync(User.GetUserId(), orderId, request);
            return Ok(expense);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpPost("receipt")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25 * 1024 * 1024)]
    public async Task<ActionResult<ImportReceiptExpensesResponse>> ImportReceipt(
        long orderId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _orderExpenseService.ImportReceiptAsync(User.GetUserId(), orderId, file, cancellationToken);
            return Ok(result);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (ReceiptImportException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpPatch("{expenseId:long}")]
    public async Task<ActionResult<OrderExpenseResponse>> Update(long orderId, long expenseId, [FromBody] UpdateOrderExpenseRequest request)
    {
        try
        {
            var expense = await _orderExpenseService.UpdateAsync(User.GetUserId(), orderId, expenseId, request);
            return Ok(expense);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderExpenseNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpDelete("{expenseId:long}")]
    public async Task<IActionResult> Delete(long orderId, long expenseId)
    {
        try
        {
            await _orderExpenseService.DeleteAsync(User.GetUserId(), orderId, expenseId);
            return NoContent();
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderExpenseNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpPut("{expenseId:long}/participation")]
    public async Task<ActionResult<OrderExpenseResponse>> SetParticipations(long orderId, long expenseId, [FromBody] SetExpenseParticipationsRequest request)
    {
        try
        {
            var expense = await _orderExpenseService.SetParticipationsAsync(User.GetUserId(), orderId, expenseId, request);
            return Ok(expense);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderExpenseNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpPost("{expenseId:long}/participation")]
    public async Task<ActionResult<OrderExpenseResponse>> ToggleParticipation(long orderId, long expenseId, [FromBody] ToggleOrderExpenseParticipationRequest request)
    {
        try
        {
            var expense = await _orderExpenseService.ToggleParticipationAsync(User.GetUserId(), orderId, expenseId, request);
            return Ok(expense);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderExpenseNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }
}
