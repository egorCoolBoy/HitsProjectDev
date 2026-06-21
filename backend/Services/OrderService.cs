using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BackHits.Services;

public sealed class OrderService : IOrderService
{
    private readonly AppDbContext _dbContext;
    private readonly TelegramOptions _telegramOptions;
    private readonly IDebtService _debtService;
    private readonly IOrderRealtimeNotifier _realtimeNotifier;

    public OrderService(
        AppDbContext dbContext,
        IOptions<TelegramOptions> telegramOptions,
        IDebtService debtService,
        IOrderRealtimeNotifier realtimeNotifier)
    {
        _dbContext = dbContext;
        _telegramOptions = telegramOptions.Value;
        _debtService = debtService;
        _realtimeNotifier = realtimeNotifier;
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

        var createdOrder = await GetOrderWithParticipantsAsync(order.Id);
        return OrderResponse.From(createdOrder ?? order);
    }

    public async Task<OrderResponse> GetByIdAsync(long userId, long orderId)
    {
        var order = await GetOrderWithParticipantsAsync(orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        await EnsureAccessAsync(userId, orderId);
        return OrderResponse.From(order);
    }

    public async Task<IReadOnlyList<OrderResponse>> GetMyAsync(
        long userId,
        OrderStatusFilter status,
        SortDirection sortDirection)
    {
        var query = _dbContext.Orders
            .Include(order => order.OrderUsers)
            .ThenInclude(membership => membership.User)
            .Where(order => order.OrderUsers.Any(membership => membership.UserId == userId));

        query = ApplyOrderStatusFilter(query, status);
        query = ApplyOrderSort(query, sortDirection);

        var orders = await query.ToListAsync();

        return orders.Select(OrderResponse.From).ToList();
    }

    public async Task<IReadOnlyList<OrderResponse>> GetByUserIdAsync(
        long userId,
        OrderStatusFilter status,
        SortDirection sortDirection)
    {
        var query = _dbContext.Orders
            .Include(order => order.OrderUsers)
            .ThenInclude(membership => membership.User)
            .Where(order => order.OrderUsers.Any(membership => membership.UserId == userId));

        query = ApplyOrderStatusFilter(query, status);
        query = ApplyOrderSort(query, sortDirection);

        var orders = await query.ToListAsync();

        return orders.Select(OrderResponse.From).ToList();
    }

    public async Task<InviteLinkResponse> CreateInviteLinkAsync(long userId, long orderId)
    {
        var order = await GetOrderWithParticipantsAsync(orderId);
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

    public async Task DeleteAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }
        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be deleted.");
        }

        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (membership is null || membership.Role != OrderRole.Creator)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }

        // Remove related memberships first (cascade might handle it depending on DB)
        var members = _dbContext.OrderUsers.Where(item => item.OrderId == orderId);
        _dbContext.OrderUsers.RemoveRange(members);
        _dbContext.Orders.Remove(order);
        await _dbContext.SaveChangesAsync();
    }

    public async Task RemoveParticipantAsync(long userId, long orderId, long participantUserId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }

        var requesterMembership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (requesterMembership is null || requesterMembership.Role != OrderRole.Creator)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }

        var participantMembership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == participantUserId && item.OrderId == orderId);

        if (participantMembership is null)
        {
            throw new OrderParticipantNotFoundException(orderId, participantUserId);
        }

        if (participantMembership.Role == OrderRole.Creator)
        {
            throw new InvalidOperationException("Order creator cannot be removed from the order.");
        }

        var orderExpenseIds = await _dbContext.OrderExpenses
            .Where(item => item.OrderId == orderId)
            .Select(item => item.Id)
            .ToListAsync();

        var expenseParticipations = _dbContext.OrderExpenseUsers
            .Where(item => item.UserId == participantUserId && orderExpenseIds.Contains(item.OrderExpenseId));

        var payments = _dbContext.Payments
            .Where(item => item.OrderId == orderId && item.UserId == participantUserId);

        _dbContext.OrderExpenseUsers.RemoveRange(expenseParticipations);
        _dbContext.Payments.RemoveRange(payments);
        _dbContext.OrderUsers.Remove(participantMembership);

        await _dbContext.SaveChangesAsync();
        await _realtimeNotifier.ParticipantRemovedAsync(orderId, userId, participantUserId);
    }

    public async Task<OrderResponse> SetStatusAsync(long userId, long orderId, bool isClosed)
    {
        var order = await GetOrderWithParticipantsAsync(orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (membership is null || membership.Role != OrderRole.Creator)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }

        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is already closed.");
        }

        if (!isClosed)
        {
            throw new InvalidOperationException("Order can only be closed.");
        }

        await EnsureOrderTotalMatchesPaymentsAsync(orderId);
        await _debtService.PersistOrderDebtsAsync(userId, orderId);

        order.IsClosed = true;
        await _dbContext.SaveChangesAsync();
        await _realtimeNotifier.OrderStatusChangedAsync(
            orderId,
            userId,
            order.IsClosed,
            order.OrderUsers.Select(item => item.UserId));

        return OrderResponse.From(order);
    }

    public async Task<OrderResponse> UpdateTitleAsync(long userId, long orderId, string? title)
    {
        var order = await GetOrderWithParticipantsAsync(orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }

        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        if (membership is null || membership.Role != OrderRole.Creator)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }

        order.Title = Normalize(title);
        await _dbContext.SaveChangesAsync();

        return OrderResponse.From(order);
    }

    public async Task<OrderMembershipResponse> JoinAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }

        var membership = await _dbContext.OrderUsers
            .FirstOrDefaultAsync(item => item.UserId == userId && item.OrderId == orderId);

        var added = false;
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
            added = true;
        }

        if (added)
        {
            var createdMembership = await _dbContext.OrderUsers
                .Include(item => item.User)
                .FirstAsync(item => item.UserId == userId && item.OrderId == orderId);

            await _realtimeNotifier.ParticipantAddedAsync(
                orderId,
                userId,
                OrderParticipantResponse.From(createdMembership));
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

    private Task<Order?> GetOrderWithParticipantsAsync(long orderId)
    {
        return _dbContext.Orders
            .Include(order => order.OrderUsers)
            .ThenInclude(membership => membership.User)
            .FirstOrDefaultAsync(item => item.Id == orderId);
    }

    private async Task EnsureOrderTotalMatchesPaymentsAsync(long orderId)
    {
        var orderTotal = await _dbContext.OrderExpenses
            .Where(item => item.OrderId == orderId)
            .Select(item => (decimal?)(item.Price * item.Quantity))
            .SumAsync() ?? 0;

        var paymentTotal = await _dbContext.Payments
            .Where(item => item.OrderId == orderId)
            .Select(item => (decimal?)item.Amount)
            .SumAsync() ?? 0;

        if (orderTotal != paymentTotal)
        {
            throw new OrderPaymentTotalMismatchException(orderId, orderTotal, paymentTotal);
        }
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static IQueryable<Order> ApplyOrderStatusFilter(IQueryable<Order> query, OrderStatusFilter status)
    {
        return status switch
        {
            OrderStatusFilter.Closed => query.Where(item => item.IsClosed),
            OrderStatusFilter.Open => query.Where(item => !item.IsClosed),
            _ => query
        };
    }

    private static IQueryable<Order> ApplyOrderSort(IQueryable<Order> query, SortDirection sortDirection)
    {
        return sortDirection == SortDirection.Asc
            ? query.OrderBy(item => item.CreatedAt).ThenBy(item => item.Id)
            : query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.Id);
    }
}
