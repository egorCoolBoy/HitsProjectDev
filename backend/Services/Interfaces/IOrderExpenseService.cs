using BackHits.Contracts;

namespace BackHits.Services;

public interface IOrderExpenseService
{
    Task<IReadOnlyList<OrderExpenseResponse>> GetAllAsync(long userId, long orderId);

    Task<OrderExpenseResponse> GetByIdAsync(long userId, long orderId, long expenseId);

    Task<OrderExpenseResponse> CreateAsync(long userId, long orderId, CreateOrderExpenseRequest request);

    Task<OrderExpenseResponse> UpdateAsync(long userId, long orderId, long expenseId, UpdateOrderExpenseRequest request);

    Task DeleteAsync(long userId, long orderId, long expenseId);

    Task<OrderExpenseResponse> ToggleParticipationAsync(long userId, long orderId, long expenseId, ToggleOrderExpenseParticipationRequest request);
}
