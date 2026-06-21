using BackHits.Contracts;
using Microsoft.AspNetCore.Http;

namespace BackHits.Services;

public interface IOrderExpenseService
{
    Task<IReadOnlyList<OrderExpenseResponse>> GetAllAsync(long userId, long orderId);

    Task<OrderExpenseResponse> GetByIdAsync(long userId, long orderId, long expenseId);

    Task<OrderExpenseResponse> CreateAsync(long userId, long orderId, CreateOrderExpenseRequest request);

    Task<ImportReceiptExpensesResponse> ImportReceiptAsync(long userId, long orderId, IFormFile file, CancellationToken cancellationToken);

    Task<OrderExpenseResponse> UpdateAsync(long userId, long orderId, long expenseId, UpdateOrderExpenseRequest request);

    Task DeleteAsync(long userId, long orderId, long expenseId);

    Task<OrderExpenseResponse> ToggleParticipationAsync(long userId, long orderId, long expenseId, ToggleOrderExpenseParticipationRequest request);

    Task<OrderExpenseResponse> SetParticipationsAsync(long userId, long orderId, long expenseId, SetExpenseParticipationsRequest request);
}
