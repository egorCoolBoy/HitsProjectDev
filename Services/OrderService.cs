using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BackHits.Services;

public interface IOrderService
{
    Task<OrderResponse> CreateAsync(long userId, string? title);

    Task<OrderResponse> GetByIdAsync(long userId, long orderId);

    Task<InviteLinkResponse> CreateInviteLinkAsync(long userId, long orderId);

    Task<OrderMembershipResponse> JoinAsync(long userId, long orderId);
}

public sealed class OrderService : IOrderService
{
    private readonly AppDbContext _dbContext;
    private readonly TelegramOptions _telegramOptions;

    public OrderService(AppDbContext dbContext, IOptions<TelegramOptions> telegramOptions)
    {
        _dbContext = dbContext;
        _telegramOptions = telegramOptions.Value;
    }

    public async Task<OrderResponse> CreateAsync(long userId, string? title)
    {
        var userExists = await _dbContext.Users.AnyAsync(item => item.Id == userId);
        if (!userExists)
        {
            throw new UserNotFoundException(userId);
        }

        var order = new Order
        {
            Title = Normalize(title),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();

        _dbContext.OrderUsers.Add(new OrderUser
        {
            UserId = userId,
            OrderId = order.Id,
            Role = OrderRole.Creator,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _dbContext.SaveChangesAsync();

        return OrderResponse.From(order);
    }

    public async Task<OrderResponse> GetByIdAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        await EnsureAccessAsync(userId, orderId);
        return OrderResponse.From(order);
    }

    public async Task<InviteLinkResponse> CreateInviteLinkAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        await EnsureAccessAsync(userId, orderId);

        if (string.IsNullOrWhiteSpace(_telegramOptions.BotUsername))
        {
            throw new InvalidOperationException("Telegram:BotUsername is required.");
        }

        var botUsername = _telegramOptions.BotUsername.Trim().TrimStart('@');
        return new InviteLinkResponse
        {
            Url = $"https://t.me/{botUsername}?start=order_{order.Id}"
        };
    }

    public async Task<OrderMembershipResponse> JoinAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (membership is null)
        {
            membership = new OrderUser
            {
                UserId = userId,
                OrderId = orderId,
                Role = OrderRole.Member,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _dbContext.OrderUsers.Add(membership);
            await _dbContext.SaveChangesAsync();
        }

        return OrderMembershipResponse.From(orderId, membership.Role);
    }

    private async Task EnsureAccessAsync(long userId, long orderId)
    {
        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (membership is null)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
