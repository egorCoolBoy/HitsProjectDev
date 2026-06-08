using BackHits.Domain;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderExpense> OrderExpenses => Set<OrderExpense>();

    public DbSet<OrderExpenseUser> OrderExpenseUsers => Set<OrderExpenseUser>();

    public DbSet<OrderUser> OrderUsers => Set<OrderUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(item => item.TelegramId).IsUnique();
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
        });

        modelBuilder.Entity<OrderExpense>(entity =>
        {
            entity.ToTable("order_expenses");
            entity.Property(item => item.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<OrderExpenseUser>(entity =>
        {
            entity.ToTable("order_expense_users");
            entity.Property(item => item.Share).HasPrecision(5, 4);

            entity.HasKey(item => new { item.OrderExpenseId, item.UserId });
        });

        modelBuilder.Entity<OrderUser>(entity =>
        {
            entity.ToTable("order_users");
            entity.Property(item => item.Role).HasConversion<string>();

            entity.HasIndex(item => new { item.UserId, item.OrderId }).IsUnique();
        });
    }
}
