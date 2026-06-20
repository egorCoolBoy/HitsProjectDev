using BackHits.Contracts;
using BackHits.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace BackHits.Services;

public sealed class OrderRealtimeNotifier : IOrderRealtimeNotifier
{
    private readonly IHubContext<OrderHub> _hubContext;

    public OrderRealtimeNotifier(IHubContext<OrderHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task ExpenseCreatedAsync(long orderId, long actorUserId, OrderExpenseResponse expense)
    {
        return SendAsync(orderId, "orderExpenseCreated", actorUserId, expense);
    }

    public Task ExpenseUpdatedAsync(long orderId, long actorUserId, OrderExpenseResponse expense)
    {
        return SendAsync(orderId, "orderExpenseUpdated", actorUserId, expense);
    }

    public Task ExpenseDeletedAsync(long orderId, long actorUserId, long expenseId)
    {
        return SendAsync(orderId, "orderExpenseDeleted", actorUserId, new OrderExpenseDeletedPayload
        {
            ExpenseId = expenseId
        });
    }

    public Task ExpenseParticipationUpdatedAsync(long orderId, long actorUserId, OrderExpenseResponse expense)
    {
        return SendAsync(orderId, "orderExpenseParticipationUpdated", actorUserId, expense);
    }

    public Task ParticipantAddedAsync(long orderId, long actorUserId, OrderParticipantResponse participant)
    {
        return SendAsync(orderId, "orderParticipantAdded", actorUserId, participant);
    }

    public Task ParticipantRemovedAsync(long orderId, long actorUserId, long participantUserId)
    {
        return SendAsync(orderId, "orderParticipantRemoved", actorUserId, new OrderParticipantRemovedPayload
        {
            UserId = participantUserId
        });
    }

    public Task PaymentCreatedAsync(long orderId, long actorUserId, PaymentResponse payment)
    {
        return SendAsync(orderId, "paymentCreated", actorUserId, payment);
    }

    public Task PaymentUpdatedAsync(long orderId, long actorUserId, PaymentResponse payment)
    {
        return SendAsync(orderId, "paymentUpdated", actorUserId, payment);
    }

    public Task PaymentDeletedAsync(long orderId, long actorUserId, long paymentId, long paymentUserId)
    {
        return SendAsync(orderId, "paymentDeleted", actorUserId, new PaymentDeletedPayload
        {
            PaymentId = paymentId,
            UserId = paymentUserId
        });
    }

    public Task DebtsChangedAsync(long orderId, long actorUserId, IEnumerable<long> userIds)
    {
        var groups = userIds
            .Distinct()
            .Select(OrderRealtimeGroups.User)
            .ToList();

        if (groups.Count == 0)
        {
            return Task.CompletedTask;
        }

        return _hubContext.Clients
            .Groups(groups)
            .SendAsync("debtsChanged", new OrderRealtimeEvent<DebtsChangedPayload>
            {
                OrderId = orderId,
                ActorUserId = actorUserId,
                OccurredAt = DateTimeOffset.UtcNow,
                Payload = new DebtsChangedPayload
                {
                    OrderId = orderId
                }
            });
    }

    private Task SendAsync<TPayload>(long orderId, string eventName, long actorUserId, TPayload payload)
    {
        return _hubContext.Clients
            .Group(OrderRealtimeGroups.Order(orderId))
            .SendAsync(eventName, new OrderRealtimeEvent<TPayload>
            {
                OrderId = orderId,
                ActorUserId = actorUserId,
                OccurredAt = DateTimeOffset.UtcNow,
                Payload = payload
            });
    }
}
