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

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<OrderUser> OrderUsers { get; set; } = new List<OrderUser>();
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
