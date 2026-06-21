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

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<Debt> Debts => Set<Debt>();

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
            entity.Property(item => item.Quantity).HasPrecision(18, 3);
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

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.Property(item => item.Amount).HasPrecision(18, 2);

            entity.HasIndex(item => new { item.OrderId, item.UserId }).IsUnique();

            entity.HasOne(item => item.Order)
                .WithMany(item => item.Payments)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.User)
                .WithMany(item => item.Payments)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Debt>(entity =>
        {
            entity.ToTable("debts");
            entity.Property(item => item.Amount).HasPrecision(18, 2);
            entity.Property(item => item.Status).HasConversion<string>();

            entity.HasOne(item => item.Order)
                .WithMany(item => item.Debts)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Debtor)
                .WithMany()
                .HasForeignKey(item => item.DebtorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(item => item.Creditor)
                .WithMany()
                .HasForeignKey(item => item.CreditorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
