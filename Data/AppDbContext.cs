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

    public DbSet<OrderUser> OrderUsers => Set<OrderUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.TelegramId).HasColumnName("telegram_id");
            entity.Property(item => item.Username).HasColumnName("username");
            entity.Property(item => item.FirstName).HasColumnName("first_name");
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");
            entity.Property(item => item.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(item => item.TelegramId).IsUnique();
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.Title).HasColumnName("title");
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<OrderUser>(entity =>
        {
            entity.ToTable("order_users");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.UserId).HasColumnName("user_id");
            entity.Property(item => item.OrderId).HasColumnName("order_id");
            entity.Property(item => item.Role).HasColumnName("role").HasConversion<string>();
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(item => new { item.UserId, item.OrderId }).IsUnique();

            entity.HasOne(item => item.User)
                .WithMany(item => item.OrderUsers)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Order)
                .WithMany(item => item.OrderUsers)
                .HasForeignKey(item => item.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
