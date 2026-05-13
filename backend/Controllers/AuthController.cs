using BackHits.Contracts;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security;

namespace BackHits.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("telegram")]
    public async Task<ActionResult<AuthTelegramResponse>> Authenticate([FromBody] AuthTelegramRequest request)
    {
        try
        {
            AuthTelegramResponse response = await _authService.AuthenticateTelegramAsync(request);
            return Ok(response);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (SecurityException exception)
        {
            return Unauthorized(new { message = exception.Message });
        }
        catch (OrderNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(exception.Message);
        }
    }
}
