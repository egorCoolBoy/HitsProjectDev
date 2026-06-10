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

public sealed class ChangeOrderTitleRequest
{
    public string? Title { get; set; }
}

public sealed class CreateOrderExpenseRequest
{
    public string? Title { get; set; }

    public decimal Price { get; set; }

    public int Quantity { get; set; } = 1;
}

public sealed class UpdateOrderExpenseRequest
{
    public string? Title { get; set; }

    public decimal Price { get; set; }

    public int Quantity { get; set; }
}

public sealed class ToggleOrderExpenseParticipationRequest
{
    public decimal Share { get; set; }
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

    public bool IsClosed { get; set; }

    public IReadOnlyList<OrderParticipantResponse> Participants { get; set; } = Array.Empty<OrderParticipantResponse>();

    public DateTimeOffset CreatedAt { get; set; }

    public static OrderResponse From(Order order)
    {
        return new OrderResponse
        {
            Id = order.Id,
            Title = order.Title,
            IsClosed = order.IsClosed,
            Participants = order.OrderUsers
                .OrderBy(item => item.CreatedAt)
                .Select(OrderParticipantResponse.From)
                .ToList(),
            CreatedAt = order.CreatedAt
        };
    }
}

public sealed class OrderParticipantResponse
{
    public long Id { get; set; }

    public OrderRole Role { get; set; }

    public UserResponse User { get; set; } = new();

    public DateTimeOffset CreatedAt { get; set; }

    public static OrderParticipantResponse From(OrderUser membership)
    {
        return new OrderParticipantResponse
        {
            Id = membership.User.Id,
            Role = membership.Role,
            User = UserResponse.From(membership.User),
            CreatedAt = membership.CreatedAt
        };
    }
}

public sealed class ChangeOrderStatusRequest
{
    public bool IsClosed { get; set; }
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

public sealed class OrderExpenseResponse
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public string? Title { get; set; }

    public decimal Price { get; set; }

    public int Quantity { get; set; }

    public decimal TotalPrice { get; set; }

    public int ParticipantCount { get; set; }

    public bool IsParticipating { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public static OrderExpenseResponse From(OrderExpense expense, int participantCount, bool isParticipating)
    {
        return new OrderExpenseResponse
        {
            Id = expense.Id,
            OrderId = expense.OrderId,
            Title = expense.Title,
            Price = expense.Price,
            Quantity = expense.Quantity,
            TotalPrice = expense.Price * expense.Quantity,
            ParticipantCount = participantCount,
            IsParticipating = isParticipating,
            CreatedAt = expense.CreatedAt,
            UpdatedAt = expense.UpdatedAt
        };
    }
}
