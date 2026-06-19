using BackHits.Domain;
using BackHits.Services;

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

public enum OrderStatusFilter
{
    All,
    Closed,
    Open
}

public enum DebtStatusFilter
{
    Active,
    Settled,
    SettlementRequested,
    All
}

public enum SortDirection
{
    Desc,
    Asc
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

public sealed class OrderExpenseParticipantResponse
{
    public long UserId { get; set; }

    public UserResponse User { get; set; } = new();

    public decimal Share { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public static OrderExpenseParticipantResponse From(OrderExpenseUser participant)
    {
        return new OrderExpenseParticipantResponse
        {
            UserId = participant.UserId,
            User = UserResponse.From(participant.User),
            Share = participant.Share,
            CreatedAt = participant.CreatedAt
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

    public IReadOnlyList<OrderExpenseParticipantResponse> Participants { get; set; } = Array.Empty<OrderExpenseParticipantResponse>();

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public static OrderExpenseResponse From(
        OrderExpense expense,
        bool isParticipating,
        IReadOnlyList<OrderExpenseParticipantResponse> participants)
    {
        return new OrderExpenseResponse
        {
            Id = expense.Id,
            OrderId = expense.OrderId,
            Title = expense.Title,
            Price = expense.Price,
            Quantity = expense.Quantity,
            TotalPrice = expense.Price * expense.Quantity,
            ParticipantCount = participants.Count,
            IsParticipating = isParticipating,
            Participants = participants,
            CreatedAt = expense.CreatedAt,
            UpdatedAt = expense.UpdatedAt
        };
    }
}

public sealed class ParticipantPaymentRequest
{
    public long UserId { get; set; }

    public decimal PaidAmount { get; set; }
}

public sealed class UpsertPaymentRequest
{
    public long UserId { get; set; }

    public decimal Amount { get; set; }
}

public sealed class PaymentResponse
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long UserId { get; set; }

    public UserResponse User { get; set; } = new();

    public decimal Amount { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public static PaymentResponse From(Payment payment)
    {
        return new PaymentResponse
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            UserId = payment.UserId,
            User = UserResponse.From(payment.User),
            Amount = payment.Amount,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}

public sealed class CalculateOrderDebtsRequest
{
    public IReadOnlyList<ParticipantPaymentRequest> Payments { get; set; } = Array.Empty<ParticipantPaymentRequest>();
}

public sealed class ParticipantBalanceResponse
{
    public long UserId { get; set; }

    public UserResponse User { get; set; } = new();

    public decimal ConsumedAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal Balance { get; set; }

    public static ParticipantBalanceResponse From(ParticipantBalance balance, User user)
    {
        return new ParticipantBalanceResponse
        {
            UserId = balance.UserId,
            User = UserResponse.From(user),
            ConsumedAmount = balance.ConsumedAmount,
            PaidAmount = balance.PaidAmount,
            Balance = balance.Balance
        };
    }
}

public sealed class DebtResponse
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long DebtorId { get; set; }

    public UserResponse Debtor { get; set; } = new();

    public long CreditorId { get; set; }

    public UserResponse Creditor { get; set; } = new();

    public decimal Amount { get; set; }

    public DebtStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? SettledAt { get; set; }

    public static DebtResponse From(Debt debt)
    {
        return new DebtResponse
        {
            Id = debt.Id,
            OrderId = debt.OrderId,
            DebtorId = debt.DebtorId,
            Debtor = UserResponse.From(debt.Debtor),
            CreditorId = debt.CreditorId,
            Creditor = UserResponse.From(debt.Creditor),
            Amount = debt.Amount,
            Status = debt.Status,
            CreatedAt = debt.CreatedAt,
            SettledAt = debt.SettledAt
        };
    }
}

public sealed class CalculateOrderDebtsResponse
{
    public IReadOnlyList<ParticipantBalanceResponse> Balances { get; set; } = Array.Empty<ParticipantBalanceResponse>();

    public IReadOnlyList<DebtResponse> Debts { get; set; } = Array.Empty<DebtResponse>();
}

public sealed class MyDebtsResponse
{
    public decimal TotalOwedByMe { get; set; }

    public decimal TotalOwedToMe { get; set; }

    public IReadOnlyList<DebtResponse> OwedByMe { get; set; } = Array.Empty<DebtResponse>();

    public IReadOnlyList<DebtResponse> OwedToMe { get; set; } = Array.Empty<DebtResponse>();
}

public sealed class BotDebtUserResponse
{
    public long UserId { get; set; }

    public long TelegramId { get; set; }

    public string? Username { get; set; }

    public string? FirstName { get; set; }

    public static BotDebtUserResponse From(User user)
    {
        return new BotDebtUserResponse
        {
            UserId = user.Id,
            TelegramId = user.TelegramId,
            Username = user.Username,
            FirstName = user.FirstName
        };
    }
}

public sealed class BotDebtOrderResponse
{
    public long Id { get; set; }

    public string? Title { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public static BotDebtOrderResponse From(Order order)
    {
        return new BotDebtOrderResponse
        {
            Id = order.Id,
            Title = order.Title,
            CreatedAt = order.CreatedAt
        };
    }
}

public sealed class BotDebtResponse
{
    public long DebtId { get; set; }

    public BotDebtOrderResponse Order { get; set; } = new();

    public BotDebtUserResponse Debtor { get; set; } = new();

    public BotDebtUserResponse Creditor { get; set; } = new();

    public decimal Amount { get; set; }

    public DebtStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? SettledAt { get; set; }

    public static BotDebtResponse From(Debt debt)
    {
        return new BotDebtResponse
        {
            DebtId = debt.Id,
            Order = BotDebtOrderResponse.From(debt.Order),
            Debtor = BotDebtUserResponse.From(debt.Debtor),
            Creditor = BotDebtUserResponse.From(debt.Creditor),
            Amount = debt.Amount,
            Status = debt.Status,
            CreatedAt = debt.CreatedAt,
            SettledAt = debt.SettledAt
        };
    }
}

public sealed class BotDebtsResponse
{
    public IReadOnlyList<BotDebtResponse> Debts { get; set; } = Array.Empty<BotDebtResponse>();
}


