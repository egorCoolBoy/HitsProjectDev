using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Services;

public sealed class DebtService : IDebtService
{
    private readonly AppDbContext _dbContext;
    private readonly IDebtCalculationService _debtCalculationService;
    private readonly IOrderRealtimeNotifier _realtimeNotifier;

    public DebtService(
        AppDbContext dbContext,
        IDebtCalculationService debtCalculationService,
        IOrderRealtimeNotifier realtimeNotifier)
    {
        _dbContext = dbContext;
        _debtCalculationService = debtCalculationService;
        _realtimeNotifier = realtimeNotifier;
    }

    public async Task<CalculateOrderDebtsResponse> CalculateDebtsAsync(long userId, long orderId, CalculateOrderDebtsRequest request)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        var participantIds = order.OrderUsers.Select(item => item.UserId).ToList();

        if (order.IsClosed && request.Payments.Count > 0)
        {
            throw new InvalidOperationException("Order is closed and cannot be modified.");
        }

        ValidatePayments(participantIds, request.Payments);

        if (order.IsClosed)
        {
            return await LoadCalculationResponseAsync(order);
        }

        if (!order.IsClosed)
        {
            await UpsertPaymentsAsync(orderId, request.Payments);
        }

        return await PersistOrderDebtsCoreAsync(order, userId);
    }

    private async Task<CalculateOrderDebtsResponse> LoadCalculationResponseAsync(Order order)
    {
        var participantIds = order.OrderUsers.Select(item => item.UserId).ToList();
        var participantUsers = order.OrderUsers.ToDictionary(item => item.UserId, item => item.User);

        var payments = await _dbContext.Payments
            .Where(item => item.OrderId == order.Id)
            .ToListAsync();

        var paidAmounts = participantIds.ToDictionary(
            id => id,
            id => payments.FirstOrDefault(item => item.UserId == id)?.Amount ?? 0m);

        var expenses = await _dbContext.OrderExpenses
            .Include(item => item.Participants)
            .Where(item => item.OrderId == order.Id)
            .ToListAsync();

        var expenseInputs = expenses
            .Select(item => new ExpenseCalculationInput(
                item.Price * item.Quantity,
                item.Participants.Select(participant => new ExpenseParticipantInput(participant.UserId, participant.Share)).ToList()))
            .ToList();

        var consumedAmounts = _debtCalculationService.CalculateConsumedAmounts(expenseInputs);
        var balances = _debtCalculationService.CalculateParticipantBalances(participantIds, consumedAmounts, paidAmounts);
        var debts = await LoadDebtsAsync(order.Id);

        return new CalculateOrderDebtsResponse
        {
            Balances = balances
                .Select(item => ParticipantBalanceResponse.From(item, participantUsers[item.UserId]))
                .ToList(),
            Debts = debts
                .Where(item => item.Status != DebtStatus.Settled)
                .Select(DebtResponse.From)
                .ToList()
        };
    }

    public async Task<CalculateOrderDebtsResponse> PersistOrderDebtsAsync(long userId, long orderId)
    {
        var order = await GetOrderWithAccessAsync(userId, orderId);
        return await PersistOrderDebtsCoreAsync(order, userId);
    }

    private async Task<CalculateOrderDebtsResponse> PersistOrderDebtsCoreAsync(Order order, long actorUserId)
    {
        var orderId = order.Id;
        var participantIds = order.OrderUsers.Select(item => item.UserId).ToList();
        var participantUsers = order.OrderUsers.ToDictionary(item => item.UserId, item => item.User);
        var affectedUserIds = new HashSet<long>();

        var payments = await _dbContext.Payments
            .Where(item => item.OrderId == orderId)
            .ToListAsync();

        var paidAmounts = participantIds.ToDictionary(
            id => id,
            id => payments.FirstOrDefault(item => item.UserId == id)?.Amount ?? 0m);

        var expenses = await _dbContext.OrderExpenses
            .Include(item => item.Participants)
            .Where(item => item.OrderId == orderId)
            .ToListAsync();

        var expenseInputs = expenses
            .Select(item => new ExpenseCalculationInput(
                item.Price * item.Quantity,
                item.Participants.Select(participant => new ExpenseParticipantInput(participant.UserId, participant.Share)).ToList()))
            .ToList();

        var consumedAmounts = _debtCalculationService.CalculateConsumedAmounts(expenseInputs);
        var balances = _debtCalculationService.CalculateParticipantBalances(participantIds, consumedAmounts, paidAmounts);
        var balanceByUserId = balances.ToDictionary(item => item.UserId, item => item.Balance);
        var calculatedDebts = _debtCalculationService.CalculateDebts(balanceByUserId);
        var nettedDebts = _debtCalculationService.CollapseDebts(calculatedDebts);

        var now = DateTimeOffset.UtcNow;
        var settledDebts = await SettleActiveDebtsAsync(orderId, now);
        AddAffectedDebtUsers(affectedUserIds, settledDebts);

        var createdDebts = nettedDebts
            .Select(transfer => new Debt
            {
                OrderId = orderId,
                DebtorId = transfer.DebtorId,
                CreditorId = transfer.CreditorId,
                Amount = transfer.Amount,
                Status = DebtStatus.Active,
                CreatedAt = now
            })
            .ToList();

        AddAffectedDebtUsers(affectedUserIds, createdDebts);

        if (createdDebts.Count > 0)
        {
            _dbContext.Debts.AddRange(createdDebts);
        }

        await _dbContext.SaveChangesAsync();
        await _realtimeNotifier.DebtsChangedAsync(orderId, actorUserId, affectedUserIds);

        var persistedDebts = await LoadDebtsAsync(orderId);

        return new CalculateOrderDebtsResponse
        {
            Balances = balances
                .Select(item => ParticipantBalanceResponse.From(item, participantUsers[item.UserId]))
                .ToList(),
            Debts = persistedDebts
                .Where(item => item.Status != DebtStatus.Settled)
                .Select(DebtResponse.From)
                .ToList()
        };
    }

    public async Task<IReadOnlyList<DebtResponse>> GetByOrderIdAsync(
        long userId,
        long orderId,
        DebtStatusFilter status,
        SortDirection sortDirection)
    {
        await GetOrderWithAccessAsync(userId, orderId);

        var debts = await ApplyDebtSort(
                ApplyDebtStatusFilter(
                    _dbContext.Debts
                        .Include(item => item.Debtor)
                        .Include(item => item.Creditor)
                        .Where(item => item.OrderId == orderId),
                    status),
                sortDirection)
            .ToListAsync();

        return debts.Select(DebtResponse.From).ToList();
    }

    public async Task<MyDebtsResponse> GetMineAsync(long userId, DebtStatusFilter status, SortDirection sortDirection)
    {
        var debts = await ApplyDebtSort(
                ApplyDebtStatusFilter(
                    _dbContext.Debts
                        .Include(item => item.Debtor)
                        .Include(item => item.Creditor)
                        .Where(item => item.DebtorId == userId || item.CreditorId == userId),
                    status),
                sortDirection)
            .ToListAsync();

        var owedByMe = debts
            .Where(item => item.DebtorId == userId)
            .Select(DebtResponse.From)
            .ToList();

        var owedToMe = debts
            .Where(item => item.CreditorId == userId)
            .Select(DebtResponse.From)
            .ToList();

        return new MyDebtsResponse
        {
            TotalOwedByMe = owedByMe.Sum(item => item.Amount),
            TotalOwedToMe = owedToMe.Sum(item => item.Amount),
            OwedByMe = owedByMe,
            OwedToMe = owedToMe
        };
    }

    public async Task<BotDebtsResponse> GetForBotAsync(
        DebtStatusFilter status,
        SortDirection sortDirection,
        long? orderId)
    {
        var query = _dbContext.Debts
            .Include(item => item.Order)
            .Include(item => item.Debtor)
            .Include(item => item.Creditor)
            .AsQueryable();

        if (orderId.HasValue)
        {
            query = query.Where(item => item.OrderId == orderId.Value);
        }

        var debts = await ApplyDebtSort(
                ApplyDebtStatusFilter(query, status),
                sortDirection)
            .ToListAsync();

        return new BotDebtsResponse
        {
            Debts = debts.Select(BotDebtResponse.From).ToList()
        };
    }

    public async Task<DebtResponse> RequestSettlementAsync(long userId, long debtId)
    {
        var debt = await GetDebtAsync(debtId);

        if (debt.DebtorId != userId)
        {
            throw new OrderAccessDeniedException(debt.OrderId, userId);
        }

        if (debt.Status == DebtStatus.Settled)
        {
            throw new InvalidOperationException("Debt is already settled.");
        }

        if (debt.Status == DebtStatus.SettlementRequested)
        {
            return DebtResponse.From(debt);
        }

        debt.Status = DebtStatus.SettlementRequested;
        await _dbContext.SaveChangesAsync();
        await NotifyDebtUsersChangedAsync(debt, userId);

        return DebtResponse.From(debt);
    }

    public async Task<DebtResponse> ConfirmSettlementAsync(long userId, long debtId)
    {
        var debt = await GetDebtAsync(debtId);

        if (debt.CreditorId != userId)
        {
            throw new OrderAccessDeniedException(debt.OrderId, userId);
        }

        if (debt.Status == DebtStatus.Settled)
        {
            return DebtResponse.From(debt);
        }

        if (debt.Status != DebtStatus.SettlementRequested)
        {
            throw new InvalidOperationException("Debt settlement has not been requested.");
        }

        debt.Status = DebtStatus.Settled;
        debt.SettledAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync();
        await NotifyDebtUsersChangedAsync(debt, userId);

        return DebtResponse.From(debt);
    }

    public async Task<DebtResponse> RejectSettlementAsync(long userId, long debtId)
    {
        var debt = await GetDebtAsync(debtId);

        if (debt.CreditorId != userId)
        {
            throw new OrderAccessDeniedException(debt.OrderId, userId);
        }

        if (debt.Status == DebtStatus.Settled)
        {
            throw new InvalidOperationException("Debt is already settled.");
        }

        if (debt.Status != DebtStatus.SettlementRequested)
        {
            throw new InvalidOperationException("Debt settlement has not been requested.");
        }

        debt.Status = DebtStatus.Active;
        debt.SettledAt = null;
        await _dbContext.SaveChangesAsync();
        await NotifyDebtUsersChangedAsync(debt, userId);

        return DebtResponse.From(debt);
    }

    private async Task UpsertPaymentsAsync(long orderId, IReadOnlyList<ParticipantPaymentRequest> payments)
    {
        if (payments.Count == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var existingPayments = await _dbContext.Payments
            .Where(item => item.OrderId == orderId)
            .ToDictionaryAsync(item => item.UserId);

        foreach (var paymentRequest in payments)
        {
            if (existingPayments.TryGetValue(paymentRequest.UserId, out var payment))
            {
                payment.Amount = paymentRequest.PaidAmount;
                payment.UpdatedAt = now;
            }
            else
            {
                _dbContext.Payments.Add(new Payment
                {
                    OrderId = orderId,
                    UserId = paymentRequest.UserId,
                    Amount = paymentRequest.PaidAmount,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        await _dbContext.SaveChangesAsync();
    }

    private async Task<List<Debt>> SettleActiveDebtsAsync(long orderId, DateTimeOffset settledAt)
    {
        var activeDebts = await _dbContext.Debts
            .Where(item => item.OrderId == orderId && item.Status != DebtStatus.Settled)
            .ToListAsync();

        foreach (var debt in activeDebts)
        {
            debt.Status = DebtStatus.Settled;
            debt.SettledAt = settledAt;
        }

        return activeDebts;
    }

    private Task NotifyDebtUsersChangedAsync(Debt debt, long actorUserId)
    {
        return _realtimeNotifier.DebtsChangedAsync(
            debt.OrderId,
            actorUserId,
            new[] { debt.DebtorId, debt.CreditorId });
    }

    private static void AddAffectedDebtUsers(ISet<long> userIds, IEnumerable<Debt> debts)
    {
        foreach (var debt in debts)
        {
            userIds.Add(debt.DebtorId);
            userIds.Add(debt.CreditorId);
        }
    }

    private Task<List<Debt>> LoadDebtsAsync(long orderId)
    {
        return _dbContext.Debts
            .Include(item => item.Debtor)
            .Include(item => item.Creditor)
            .Where(item => item.OrderId == orderId)
            .OrderByDescending(item => item.Id)
            .ToListAsync();
    }

    private async Task<Debt> GetDebtAsync(long debtId)
    {
        var debt = await _dbContext.Debts
            .Include(item => item.Debtor)
            .Include(item => item.Creditor)
            .FirstOrDefaultAsync(item => item.Id == debtId);

        if (debt is null)
        {
            throw new DebtNotFoundException(debtId);
        }

        return debt;
    }

    private async Task<Order> GetOrderWithAccessAsync(long userId, long orderId)
    {
        var order = await _dbContext.Orders
            .Include(item => item.OrderUsers)
            .ThenInclude(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == orderId);

        if (order is null)
        {
            throw new OrderNotFoundException(orderId);
        }

        var membership = order.OrderUsers.FirstOrDefault(item => item.UserId == userId);
        if (membership is null)
        {
            throw new OrderAccessDeniedException(orderId, userId);
        }

        return order;
    }

    private static void ValidatePayments(IReadOnlyList<long> participantIds, IReadOnlyList<ParticipantPaymentRequest> payments)
    {
        var duplicatedUserId = payments
            .GroupBy(item => item.UserId)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .FirstOrDefault();

        if (duplicatedUserId != 0)
        {
            throw new ArgumentException($"Payment for user {duplicatedUserId} is duplicated.");
        }

        foreach (var payment in payments)
        {
            if (!participantIds.Contains(payment.UserId))
            {
                throw new ArgumentException($"User {payment.UserId} is not a participant of this order.");
            }

            if (payment.PaidAmount < 0)
            {
                throw new ArgumentException("Paid amount cannot be negative.");
            }
        }
    }

    private static IQueryable<Debt> ApplyDebtStatusFilter(IQueryable<Debt> query, DebtStatusFilter status)
    {
        return status switch
        {
            DebtStatusFilter.Active => query.Where(item => item.Status != DebtStatus.Settled),
            DebtStatusFilter.Settled => query.Where(item => item.Status == DebtStatus.Settled),
            DebtStatusFilter.SettlementRequested => query.Where(item => item.Status == DebtStatus.SettlementRequested),
            _ => query
        };
    }

    private static IQueryable<Debt> ApplyDebtSort(IQueryable<Debt> query, SortDirection sortDirection)
    {
        return sortDirection == SortDirection.Asc
            ? query.OrderBy(item => item.CreatedAt).ThenBy(item => item.Id)
            : query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.Id);
    }
}
