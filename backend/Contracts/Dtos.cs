using BackHits.Domain;

namespace BackHits.Contracts;

public sealed class AuthTelegramRequest
{
    public string InitData { get; set; } = string.Empty;

    public long? OrderId { get; set; }
}

public sealed class AuthTelegramResponse
{
    public string Token { get; set; } = string.Empty;

    public UserResponse User { get; set; } = new();

    public OrderMembershipResponse? Order { get; set; }
}

public sealed class CreateOrderRequest
{
    public string? Title { get; set; }
}

public sealed class InviteLinkResponse
{
    public string Url { get; set; } = string.Empty;
}

public sealed class UserResponse
{
    public long Id { get; set; }

    public long TelegramId { get; set; }

    public string? Username { get; set; }

    public string? FirstName { get; set; }

    public string? PhotoUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public static UserResponse From(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            TelegramId = user.TelegramId,
            Username = user.Username,
            FirstName = user.FirstName,
            PhotoUrl = null,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}

public sealed class OrderResponse
{
    public long Id { get; set; }

    public string? Title { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public static OrderResponse From(Order order)
    {
        return new OrderResponse
        {
            Id = order.Id,
            Title = order.Title,
            CreatedAt = order.CreatedAt
        };
    }
}

public sealed class OrderMembershipResponse
{
    public long Id { get; set; }

    public OrderRole Role { get; set; }

    public static OrderMembershipResponse From(long orderId, OrderRole role)
    {
        return new OrderMembershipResponse
        {
            Id = orderId,
            Role = role
        };
    }
}
