using BackHits.Contracts;

namespace BackHits.Services;

public interface IPaymentService
{
    Task<IReadOnlyList<PaymentResponse>> GetByOrderIdAsync(long userId, long orderId);

    Task<PaymentResponse> UpsertAsync(long userId, long orderId, UpsertPaymentRequest request);

    Task DeleteAsync(long userId, long orderId, long paymentId);
}
