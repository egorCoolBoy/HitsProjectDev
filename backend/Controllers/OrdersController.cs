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

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
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
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetMine()
    {
        var orders = await _orderService.GetMyAsync(User.GetUserId());
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

}
