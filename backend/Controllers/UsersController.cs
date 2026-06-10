using BackHits.Contracts;
using BackHits.Extensions;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackHits.Controllers;

[ApiController]
[Authorize]
[Route("users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IOrderService _orderService;

    public UsersController(IUserService userService, IOrderService orderService)
    {
        _userService = userService;
        _orderService = orderService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me()
    {
        try
        {
            var user = await _userService.GetMeAsync(User.GetUserId());
            return Ok(user);
        }
        catch (UserNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [HttpGet("{userId:long}/orders")]
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetOrdersByUserId(long userId)
    {
        var orders = await _orderService.GetByUserIdAsync(userId);
        return Ok(orders);
    }
}
