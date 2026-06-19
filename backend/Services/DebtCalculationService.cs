namespace BackHits.Services;

public sealed class DebtCalculationService : IDebtCalculationService
{
    private const decimal Tolerance = 0.01m;

    public IReadOnlyDictionary<long, decimal> CalculateConsumedAmounts(IReadOnlyList<ExpenseCalculationInput> expenses)
    {
        var consumedAmounts = new Dictionary<long, decimal>();

        foreach (var expense in expenses)
        {
            if (expense.Participants.Count == 0)
            {
                continue;
            }

            var totalShare = expense.Participants.Sum(item => item.Share);
            if (Math.Abs(totalShare - 1m) > Tolerance)
            {
                throw new ArgumentException("Every expense must have participant shares that sum to 1.");
            }

            foreach (var participant in expense.Participants)
            {
                if (!consumedAmounts.TryAdd(participant.UserId, expense.TotalPrice * participant.Share))
                {
                    consumedAmounts[participant.UserId] += expense.TotalPrice * participant.Share;
                }
            }
        }

        return consumedAmounts;
    }

    public IReadOnlyList<ParticipantBalance> CalculateParticipantBalances(
        IReadOnlyList<long> participantIds,
        IReadOnlyDictionary<long, decimal> consumedAmounts,
        IReadOnlyDictionary<long, decimal> paidAmounts)
    {
        return participantIds
            .Select(participantId =>
            {
                var consumedAmount = consumedAmounts.GetValueOrDefault(participantId);
                var paidAmount = paidAmounts.GetValueOrDefault(participantId);
                return new ParticipantBalance(
                    participantId,
                    consumedAmount,
                    paidAmount,
                    paidAmount - consumedAmount);
            })
            .ToList();
    }

    public IReadOnlyList<DebtTransferResult> CalculateDebts(IReadOnlyDictionary<long, decimal> balances)
    {
        var creditors = balances
            .Where(item => item.Value > Tolerance)
            .OrderByDescending(item => item.Value)
            .ToList();

        var debtors = balances
            .Where(item => item.Value < -Tolerance)
            .OrderBy(item => item.Value)
            .ToList();

        var creditorBalances = creditors.ToDictionary(item => item.Key, item => item.Value);
        var debtorBalances = debtors.ToDictionary(item => item.Key, item => -item.Value);
        var debts = new List<DebtTransferResult>();

        foreach (var debtor in debtors)
        {
            var debtRemaining = debtorBalances[debtor.Key];

            foreach (var creditor in creditors)
            {
                if (debtRemaining < Tolerance)
                {
                    break;
                }

                var creditRemaining = creditorBalances[creditor.Key];
                if (creditRemaining < Tolerance)
                {
                    continue;
                }

                var amount = Math.Min(debtRemaining, creditRemaining);
                debts.Add(new DebtTransferResult(debtor.Key, creditor.Key, amount));

                debtRemaining -= amount;
                creditRemaining -= amount;

                creditorBalances[creditor.Key] = creditRemaining;
                debtorBalances[debtor.Key] = debtRemaining;
            }
        }

        return debts;
    }

    public IReadOnlyList<DebtTransferResult> CollapseDebts(IReadOnlyList<DebtTransferResult> debts)
    {
        var pairAmounts = new Dictionary<(long First, long Second), (decimal Forward, decimal Reverse)>();

        foreach (var debt in debts)
        {
            var first = Math.Min(debt.DebtorId, debt.CreditorId);
            var second = Math.Max(debt.DebtorId, debt.CreditorId);

            if (!pairAmounts.TryGetValue((first, second), out var amounts))
            {
                amounts = (0m, 0m);
            }

            if (debt.DebtorId == first)
            {
                amounts.Forward += debt.Amount;
            }
            else
            {
                amounts.Reverse += debt.Amount;
            }

            pairAmounts[(first, second)] = amounts;
        }

        var collapsedDebts = new List<DebtTransferResult>();

        foreach (var ((first, second), (forward, reverse)) in pairAmounts)
        {
            var net = forward - reverse;

            if (net > Tolerance)
            {
                collapsedDebts.Add(new DebtTransferResult(first, second, net));
            }
            else if (net < -Tolerance)
            {
                collapsedDebts.Add(new DebtTransferResult(second, first, -net));
            }
        }

        return collapsedDebts;
    }
}
