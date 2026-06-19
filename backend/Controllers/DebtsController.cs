using BackHits.Contracts;
using BackHits.Extensions;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackHits.Controllers;

[ApiController]
[Authorize]
[Route("debts")]
public sealed class DebtsController : ControllerBase
{
    private readonly IDebtService _debtService;

    public DebtsController(IDebtService debtService)
    {
        _debtService = debtService;
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<ActionResult<MyDebtsResponse>> GetMine(
        [FromQuery] DebtStatusFilter status = DebtStatusFilter.Active,
        [FromQuery] SortDirection sortDirection = SortDirection.Desc)
    {
        var debts = await _debtService.GetMineAsync(User.GetUserId(), status, sortDirection);
        return Ok(debts);
    }

    [Authorize]
    [HttpPost("{debtId:long}/settle")]
    [HttpPost("{debtId:long}/settlement-request")]
    public async Task<ActionResult<DebtResponse>> RequestSettlement(long debtId)
    {
        try
        {
            var debt = await _debtService.RequestSettlementAsync(User.GetUserId(), debtId);
            return Ok(debt);
        }
        catch (DebtNotFoundException exception)
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
    [HttpPost("{debtId:long}/settlement-confirm")]
    public async Task<ActionResult<DebtResponse>> ConfirmSettlement(long debtId)
    {
        try
        {
            var debt = await _debtService.ConfirmSettlementAsync(User.GetUserId(), debtId);
            return Ok(debt);
        }
        catch (DebtNotFoundException exception)
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
    [HttpPost("{debtId:long}/settlement-reject")]
    public async Task<ActionResult<DebtResponse>> RejectSettlement(long debtId)
    {
        try
        {
            var debt = await _debtService.RejectSettlementAsync(User.GetUserId(), debtId);
            return Ok(debt);
        }
        catch (DebtNotFoundException exception)
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
