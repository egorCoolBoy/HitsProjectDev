using BackHits.Contracts;
using BackHits.Extensions;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackHits.Controllers;

[ApiController]
[Authorize]
[Route("orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IDebtService _debtService;
    private readonly IPaymentService _paymentService;

    public OrdersController(
        IOrderService orderService,
        IDebtService debtService,
        IPaymentService paymentService)
    {
        _orderService = orderService;
        _debtService = debtService;
        _paymentService = paymentService;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<OrderResponse>> Create([FromBody] CreateOrderRequest request)
    {
        try
        {
            var order = await _orderService.CreateAsync(User.GetUserId(), request.Title);
            return Ok(order);
        }
        catch (UserNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [Authorize]
    [HttpGet("{id:long}")]
    public async Task<ActionResult<OrderResponse>> GetById(long id)
    {
        try
        {
            var order = await _orderService.GetByIdAsync(User.GetUserId(), id);
            return Ok(order);
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
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetMine(
        [FromQuery] OrderStatusFilter status = OrderStatusFilter.All,
        [FromQuery] SortDirection sortDirection = SortDirection.Desc)
    {
        var orders = await _orderService.GetMyAsync(User.GetUserId(), status, sortDirection);
        return Ok(orders);
    }

    [Authorize]
    [HttpPost("{id:long}/invite-link")]
    public async Task<ActionResult<InviteLinkResponse>> CreateInviteLink(long id)
    {
        try
        {
            InviteLinkResponse? response = await _orderService.CreateInviteLinkAsync(User.GetUserId(), id);
            return Ok(response);
        }
        catch (OrderNotFoundException exception)
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
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _orderService.DeleteAsync(User.GetUserId(), id);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
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
    [HttpDelete("{id:long}/participants/{participantUserId:long}")]
    public async Task<IActionResult> RemoveParticipant(long id, long participantUserId)
    {
        try
        {
            await _orderService.RemoveParticipantAsync(User.GetUserId(), id, participantUserId);
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderParticipantNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpPatch("{id:long}/status")]
    public async Task<ActionResult<OrderResponse>> SetStatus(long id, [FromBody] ChangeOrderStatusRequest request)
    {
        try
        {
            var response = await _orderService.SetStatusAsync(User.GetUserId(), id, request.IsClosed);
            return Ok(response);
        }
        catch (OrderNotFoundException exception)
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
    [HttpPatch("{id:long}/title")]
    public async Task<ActionResult<OrderResponse>> UpdateTitle(long id, [FromBody] ChangeOrderTitleRequest request)
    {
        try
        {
            var response = await _orderService.UpdateTitleAsync(User.GetUserId(), id, request.Title);
            return Ok(response);
        }
        catch (OrderNotFoundException exception)
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
    [HttpGet("{id:long}/debts")]
    public async Task<ActionResult<IReadOnlyList<DebtResponse>>> GetDebts(
        long id,
        [FromQuery] DebtStatusFilter status = DebtStatusFilter.All,
        [FromQuery] SortDirection sortDirection = SortDirection.Desc)
    {
        try
        {
            var debts = await _debtService.GetByOrderIdAsync(User.GetUserId(), id, status, sortDirection);
            return Ok(debts);
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
    [HttpGet("{id:long}/payments")]
    public async Task<ActionResult<IReadOnlyList<PaymentResponse>>> GetPayments(long id)
    {
        try
        {
            var payments = await _paymentService.GetByOrderIdAsync(User.GetUserId(), id);
            return Ok(payments);
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
    [HttpPost("{id:long}/payments")]
    public async Task<ActionResult<PaymentResponse>> UpsertPayment(long id, [FromBody] UpsertPaymentRequest request)
    {
        try
        {
            var payment = await _paymentService.UpsertAsync(User.GetUserId(), id, request);
            return Ok(payment);
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (PaymentAccessDeniedException)
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
    [HttpDelete("{id:long}/payments/{paymentId:long}")]
    public async Task<IActionResult> DeletePayment(long id, long paymentId)
    {
        try
        {
            await _paymentService.DeleteAsync(User.GetUserId(), id, paymentId);
            return NoContent();
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (PaymentNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (OrderAccessDeniedException)
        {
            return Forbid();
        }
        catch (PaymentAccessDeniedException)
        {
            return Forbid();
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }

    [Authorize]
    [HttpPost("{id:long}/calculate-debts")]
    public async Task<ActionResult<CalculateOrderDebtsResponse>> CalculateDebts(long id, [FromBody] CalculateOrderDebtsRequest request)
    {
        try
        {
            var response = await _debtService.CalculateDebtsAsync(User.GetUserId(), id, request);
            return Ok(response);
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

}
