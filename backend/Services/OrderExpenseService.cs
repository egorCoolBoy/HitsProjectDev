using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Services;

public sealed class OrderExpenseService : IOrderExpenseService
{
    private readonly AppDbContext _dbContext;

    public OrderExpenseService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<OrderExpenseResponse>> GetAllAsync(long userId, long orderId)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        var expenses = await _dbContext.OrderExpenses
            .Where(item => item.OrderId == order.Id)
            .OrderByDescending(item => item.Id)
            .ToListAsync();

        return await MapExpensesAsync(userId, expenses);
    }

    public async Task<OrderExpenseResponse> GetByIdAsync(long userId, long orderId, long expenseId)
    {
        await GetOrderWithAccessAsync(userId, orderId);
        var expense = await GetExpenseAsync(orderId, expenseId);
        return await MapExpenseAsync(userId, expense);
    }

    public async Task<OrderExpenseResponse> CreateAsync(long userId, long orderId, CreateOrderExpenseRequest request)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);
        ValidateRequest(request.Title, request.Price, request.Quantity);

        var expense = new OrderExpense
        {
            OrderId = orderId,
            Title = Normalize(request.Title),
            Price = request.Price,
            Quantity = request.Quantity,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.OrderExpenses.Add(expense);
        await _dbContext.SaveChangesAsync();

        return await MapExpenseAsync(userId, expense);
    }

    public async Task<OrderExpenseResponse> UpdateAsync(long userId, long orderId, long expenseId, UpdateOrderExpenseRequest request)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);

        var expense = await GetExpenseAsync(orderId, expenseId);

        ValidateRequest(request.Title, request.Price, request.Quantity);

        expense.Title = Normalize(request.Title);
        expense.Price = request.Price;
        expense.Quantity = request.Quantity;
        expense.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync();

        return await MapExpenseAsync(userId, expense);
    }

    public async Task DeleteAsync(long userId, long orderId, long expenseId)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);

        var expense = await GetExpenseAsync(orderId, expenseId);

        _dbContext.OrderExpenses.Remove(expense);
        await _dbContext.SaveChangesAsync();
    }

    public async Task<OrderExpenseResponse> ToggleParticipationAsync(long userId, long orderId, long expenseId, ToggleOrderExpenseParticipationRequest request)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);

        var expense = await GetExpenseAsync(orderId, expenseId);

        var existing = await _dbContext.OrderExpenseUsers
            .FirstOrDefaultAsync(item => item.OrderExpenseId == expense.Id && item.UserId == userId);

        if (existing is null)
        {
            ValidateShare(request.Share);

            _dbContext.OrderExpenseUsers.Add(new OrderExpenseUser
            {
                OrderExpenseId = expense.Id,
                UserId = userId,
                Share = request.Share,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else
        {
            _dbContext.OrderExpenseUsers.Remove(existing);
        }

        await _dbContext.SaveChangesAsync();
        return await MapExpenseAsync(userId, expense);
    }

    private async Task<Order> GetOrderWithAccessAsync(long userId, long orderId)
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
            throw new OrderAccessDeniedException(orderId, userId);
        }

        return order;
    }

    private async Task<OrderExpense> GetExpenseAsync(long orderId, long expenseId)
    {
        var expense = await _dbContext.OrderExpenses.FirstOrDefaultAsync(item => item.Id == expenseId && item.OrderId == orderId);
        if (expense is null)
        {
            throw new OrderExpenseNotFoundException(expenseId);
        }

        return expense;
    }

    private async Task<OrderExpenseResponse> MapExpenseAsync(long userId, OrderExpense expense)
    {
        var participantCount = await _dbContext.OrderExpenseUsers.CountAsync(item => item.OrderExpenseId == expense.Id);
        var isParticipating = await _dbContext.OrderExpenseUsers
            .AnyAsync(item => item.OrderExpenseId == expense.Id && item.UserId == userId);

        return OrderExpenseResponse.From(expense, participantCount, isParticipating);
    }

    private async Task<IReadOnlyList<OrderExpenseResponse>> MapExpensesAsync(long userId, IReadOnlyList<OrderExpense> expenses)
    {
        if (expenses.Count == 0)
        {
            return Array.Empty<OrderExpenseResponse>();
        }

        var expenseIds = expenses.Select(item => item.Id).ToArray();
        var participantCounts = await _dbContext.OrderExpenseUsers
            .Where(item => expenseIds.Contains(item.OrderExpenseId))
            .GroupBy(item => item.OrderExpenseId)
            .Select(group => new { OrderExpenseId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.OrderExpenseId, item => item.Count);

        var participatingExpenseIds = await _dbContext.OrderExpenseUsers
            .Where(item => expenseIds.Contains(item.OrderExpenseId) && item.UserId == userId)
            .Select(item => item.OrderExpenseId)
            .ToListAsync();

        var participatingSet = participatingExpenseIds.ToHashSet();

        return expenses
            .Select(item => OrderExpenseResponse.From(
                item,
                participantCounts.TryGetValue(item.Id, out var count) ? count : 0,
                participatingSet.Contains(item.Id)))
            .ToList();
    }

    private static void EnsureMutable(Order order)
    {
        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }
    }

    private static void ValidateRequest(string? title, decimal price, int quantity)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Expense title is required.");
        }

        if (price < 0)
        {
            throw new ArgumentException("Expense price cannot be negative.");
        }

        if (quantity <= 0)
        {
            throw new ArgumentException("Expense quantity must be greater than zero.");
        }
    }

    private static void ValidateShare(decimal share)
    {
        if (share < 0 || share > 1)
        {
            throw new ArgumentException("Expense share must be between 0 and 1.");
        }
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
