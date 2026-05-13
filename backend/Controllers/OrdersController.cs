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

    // [HttpPost("{id:long}/join")]
    // public async Task<ActionResult<OrderMembershipResponse>> Join(long id)
    // {
    //     try
    //     {
    //         OrderMembershipResponse? response = await _orderService.JoinAsync(User.GetUserId(), id);
    //         return Ok(response);
    //     }
    //     catch (OrderNotFoundException exception)
    //     {
    //         return NotFound(new { message = exception.Message });
    //     }
    // }
}
