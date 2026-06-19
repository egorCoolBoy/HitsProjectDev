using BackHits.Contracts;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BackHits.Controllers;

[ApiController]
[AllowAnonymous]
[Route("bot")]
public sealed class BotController : ControllerBase
{
    private const string BotTokenHeader = "X-Bot-Token";

    private readonly IDebtService _debtService;
    private readonly TelegramOptions _telegramOptions;

    public BotController(IDebtService debtService, IOptions<TelegramOptions> telegramOptions)
    {
        _debtService = debtService;
        _telegramOptions = telegramOptions.Value;
    }

    [HttpGet("debts")]
    public async Task<ActionResult<BotDebtsResponse>> GetDebts(
        [FromQuery] DebtStatusFilter status = DebtStatusFilter.Active,
        [FromQuery] SortDirection sortDirection = SortDirection.Desc,
        [FromQuery] long? orderId = null)
    {
        if (!IsAuthorizedBotRequest())
        {
            return Unauthorized(new { message = "Invalid bot token." });
        }

        var response = await _debtService.GetForBotAsync(status, sortDirection, orderId);
        return Ok(response);
    }

    private bool IsAuthorizedBotRequest()
    {
        if (string.IsNullOrWhiteSpace(_telegramOptions.BotToken))
        {
            return false;
        }

        if (!Request.Headers.TryGetValue(BotTokenHeader, out var providedToken))
        {
            return false;
        }

        return string.Equals(
            providedToken.ToString(),
            _telegramOptions.BotToken,
            StringComparison.Ordinal);
    }
}
