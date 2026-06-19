using BackHits.Contracts;

namespace BackHits.Services;

public interface IOrderService
{
    Task<OrderResponse> CreateAsync(long userId, string? title);

    Task<OrderResponse> GetByIdAsync(long userId, long orderId);

    Task<IReadOnlyList<OrderResponse>> GetMyAsync(
        long userId,
        OrderStatusFilter status,
        SortDirection sortDirection);

    Task<IReadOnlyList<OrderResponse>> GetByUserIdAsync(
        long userId,
        OrderStatusFilter status,
        SortDirection sortDirection);

    Task<InviteLinkResponse> CreateInviteLinkAsync(long userId, long orderId);

    Task<OrderMembershipResponse> JoinAsync(long userId, long orderId);

    Task DeleteAsync(long userId, long orderId);

    Task RemoveParticipantAsync(long userId, long orderId, long participantUserId);

    Task<OrderResponse> SetStatusAsync(long userId, long orderId, bool isClosed);

    Task<OrderResponse> UpdateTitleAsync(long userId, long orderId, string? title);
}
