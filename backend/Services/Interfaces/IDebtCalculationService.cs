namespace BackHits.Services;

public sealed record ExpenseCalculationInput(
    decimal TotalPrice,
    IReadOnlyList<ExpenseParticipantInput> Participants);

public sealed record ExpenseParticipantInput(long UserId, decimal Share);

public sealed record ParticipantBalance(
    long UserId,
    decimal ConsumedAmount,
    decimal PaidAmount,
    decimal Balance);

public sealed record DebtTransferResult(
    long DebtorId,
    long CreditorId,
    decimal Amount);

public interface IDebtCalculationService
{
    IReadOnlyDictionary<long, decimal> CalculateConsumedAmounts(IReadOnlyList<ExpenseCalculationInput> expenses);

    IReadOnlyList<ParticipantBalance> CalculateParticipantBalances(
        IReadOnlyList<long> participantIds,
        IReadOnlyDictionary<long, decimal> consumedAmounts,
        IReadOnlyDictionary<long, decimal> paidAmounts);

    IReadOnlyList<DebtTransferResult> CalculateDebts(IReadOnlyDictionary<long, decimal> balances);

    IReadOnlyList<DebtTransferResult> CollapseDebts(IReadOnlyList<DebtTransferResult> debts);
}
