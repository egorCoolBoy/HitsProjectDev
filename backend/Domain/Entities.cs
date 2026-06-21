namespace BackHits.Domain;

public sealed class User
{
    public long Id { get; set; }

    public long TelegramId { get; set; }

    public string? Username { get; set; }

    public string? FirstName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<OrderUser> OrderUsers { get; set; } = new List<OrderUser>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public sealed class Order
{
    public long Id { get; set; }

    public string? Title { get; set; }

    // Закрыт ли заказ. Если закрыт — запрещены изменения.
    public bool IsClosed { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<OrderUser> OrderUsers { get; set; } = new List<OrderUser>();

    public ICollection<OrderExpense> OrderExpenses { get; set; } = new List<OrderExpense>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public ICollection<Debt> Debts { get; set; } = new List<Debt>();
}

public sealed class Payment
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long UserId { get; set; }

    public decimal Amount { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public Order Order { get; set; } = null!;

    public User User { get; set; } = null!;
}

public sealed class OrderExpense
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public string? Title { get; set; }

    public decimal Price { get; set; }

    public decimal Quantity { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public Order Order { get; set; } = null!;

    public ICollection<OrderExpenseUser> Participants { get; set; } = new List<OrderExpenseUser>();
}

public sealed class OrderExpenseUser
{
    public long OrderExpenseId { get; set; }

    public long UserId { get; set; }

    public decimal Share { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public OrderExpense OrderExpense { get; set; } = null!;

    public User User { get; set; } = null!;
}

public sealed class OrderUser
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long OrderId { get; set; }

    public OrderRole Role { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public User User { get; set; } = null!;

    public Order Order { get; set; } = null!;
}

public enum OrderRole
{
    Creator,
    Member
}

public enum DebtStatus
{
    Active,
    SettlementRequested,
    Settled
}

public sealed class Debt
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public long DebtorId { get; set; }

    public long CreditorId { get; set; }

    public decimal Amount { get; set; }

    public DebtStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? SettledAt { get; set; }

    public Order Order { get; set; } = null!;

    public User Debtor { get; set; } = null!;

    public User Creditor { get; set; } = null!;
}
