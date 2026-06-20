using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Services;

public sealed class PaymentService : IPaymentService
{
    private readonly AppDbContext _dbContext;
    private readonly IOrderRealtimeNotifier _realtimeNotifier;

    public PaymentService(AppDbContext dbContext, IOrderRealtimeNotifier realtimeNotifier)
    {
        _dbContext = dbContext;
        _realtimeNotifier = realtimeNotifier;
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetByOrderIdAsync(long userId, long orderId)
    {
        await GetOrderWithAccessAsync(userId, orderId);

        var payments = await _dbContext.Payments
            .Include(item => item.User)
            .Where(item => item.OrderId == orderId)
            .OrderBy(item => item.UserId)
            .ToListAsync();

        return payments.Select(PaymentResponse.From).ToList();
    }

    public async Task<PaymentResponse> UpsertAsync(long userId, long orderId, UpsertPaymentRequest request)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);
        EnsureOwnPayment(userId, request.UserId);
        ValidateAmount(request.Amount);
        await EnsureParticipantAsync(orderId, request.UserId);

        var now = DateTimeOffset.UtcNow;
        var payment = await _dbContext.Payments
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.OrderId == orderId && item.UserId == request.UserId);
        var isNewPayment = payment is null;

        if (payment is null)
        {
            payment = new Payment
            {
                OrderId = orderId,
                UserId = request.UserId,
                Amount = request.Amount,
                CreatedAt = now,
                UpdatedAt = now
            };
            _dbContext.Payments.Add(payment);
        }
        else
        {
            payment.Amount = request.Amount;
            payment.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync();

        var response = PaymentResponse.From(await LoadPaymentAsync(payment.Id));
        if (isNewPayment)
        {
            await _realtimeNotifier.PaymentCreatedAsync(orderId, userId, response);
        }
        else
        {
            await _realtimeNotifier.PaymentUpdatedAsync(orderId, userId, response);
        }

        return response;
    }

    public async Task DeleteAsync(long userId, long orderId, long paymentId)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        EnsureMutable(order);

        var payment = await _dbContext.Payments
            .FirstOrDefaultAsync(item => item.Id == paymentId && item.OrderId == orderId);

        if (payment is null)
        {
            throw new PaymentNotFoundException(paymentId);
        }

        EnsureOwnPayment(userId, payment.UserId, payment.Id);

        _dbContext.Payments.Remove(payment);
        await _dbContext.SaveChangesAsync();
        await _realtimeNotifier.PaymentDeletedAsync(orderId, userId, paymentId, payment.UserId);
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

    private async Task EnsureParticipantAsync(long orderId, long participantUserId)
    {
        var isParticipant = await _dbContext.OrderUsers
            .AnyAsync(item => item.OrderId == orderId && item.UserId == participantUserId);

        if (!isParticipant)
        {
            throw new ArgumentException($"User {participantUserId} is not a participant of this order.");
        }
    }

    private async Task<Payment> LoadPaymentAsync(long paymentId)
    {
        return await _dbContext.Payments
            .Include(item => item.User)
            .FirstAsync(item => item.Id == paymentId);
    }

    private static void EnsureMutable(Order order)
    {
        if (order.IsClosed)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }
    }

    private static void EnsureOwnPayment(long userId, long paymentUserId, long paymentId = 0)
    {
        if (paymentUserId != userId)
        {
            throw new PaymentAccessDeniedException(paymentId, userId);
        }
    }

    private static void ValidateAmount(decimal amount)
    {
        if (amount < 0)
        {
            throw new ArgumentException("Payment amount cannot be negative.");
        }
    }
}
