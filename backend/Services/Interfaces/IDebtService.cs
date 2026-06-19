using BackHits.Contracts;

namespace BackHits.Services;

public interface IDebtService
{
    Task<CalculateOrderDebtsResponse> CalculateDebtsAsync(long userId, long orderId, CalculateOrderDebtsRequest request);

    Task<CalculateOrderDebtsResponse> PersistOrderDebtsAsync(long userId, long orderId);

    Task<MyDebtsResponse> GetMineAsync(long userId, DebtStatusFilter status, SortDirection sortDirection);

    Task<IReadOnlyList<DebtResponse>> GetByOrderIdAsync(
        long userId,
        long orderId,
        DebtStatusFilter status,
        SortDirection sortDirection);

    Task<DebtResponse> RequestSettlementAsync(long userId, long debtId);

    Task<DebtResponse> ConfirmSettlementAsync(long userId, long debtId);

    Task<DebtResponse> RejectSettlementAsync(long userId, long debtId);
}
