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

    public UsersController(IUserService userService)
    {
        _userService = userService;
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
}
