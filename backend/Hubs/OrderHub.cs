using BackHits.Data;
using BackHits.Extensions;
using BackHits.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Hubs;

[Authorize]
public sealed class OrderHub : Hub
{
    private readonly AppDbContext _dbContext;

    public OrderHub(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task JoinOrder(long orderId)
    {
        var userId = Context.User?.GetUserId()
            ?? throw new HubException("Authenticated user id is missing.");

        var hasAccess = await _dbContext.OrderUsers
            .AnyAsync(item => item.OrderId == orderId && item.UserId == userId);

        if (!hasAccess)
        {
            throw new HubException($"User has no access to order {orderId}.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, OrderRealtimeGroups.Order(orderId));
    }

    public Task LeaveOrder(long orderId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, OrderRealtimeGroups.Order(orderId));
    }
}

public static class OrderRealtimeGroups
{
    public static string Order(long orderId)
    {
        return $"order:{orderId}";
    }
}
