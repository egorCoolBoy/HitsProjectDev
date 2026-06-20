using BackHits.Contracts;

namespace BackHits.Services;

public interface IOrderRealtimeNotifier
{
    Task ExpenseCreatedAsync(long orderId, long actorUserId, OrderExpenseResponse expense);

    Task ExpenseUpdatedAsync(long orderId, long actorUserId, OrderExpenseResponse expense);

    Task ExpenseDeletedAsync(long orderId, long actorUserId, long expenseId);

    Task PaymentCreatedAsync(long orderId, long actorUserId, PaymentResponse payment);

    Task PaymentUpdatedAsync(long orderId, long actorUserId, PaymentResponse payment);

    Task PaymentDeletedAsync(long orderId, long actorUserId, long paymentId, long paymentUserId);
}
