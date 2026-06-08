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
}

public sealed class OrderExpense
{
    public long Id { get; set; }

    public long OrderId { get; set; }

    public string? Title { get; set; }

    public decimal Price { get; set; }

    public int Quantity { get; set; }

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
