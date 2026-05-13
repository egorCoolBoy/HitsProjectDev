using System;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace BackHits.Data.Migrations;

[DbContext(typeof(AppDbContext))]
partial class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasAnnotation("ProductVersion", "8.0.8")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);

        modelBuilder.Entity("BackHits.Domain.Order", b =>
        {
            b.Property<long>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("bigint")
                .HasColumnName("id")
                .HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            b.Property<DateTimeOffset>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("Title")
                .HasColumnType("text")
                .HasColumnName("title");

            b.HasKey("Id");

            b.ToTable("orders");
        });

        modelBuilder.Entity("BackHits.Domain.OrderUser", b =>
        {
            b.Property<long>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("bigint")
                .HasColumnName("id")
                .HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            b.Property<DateTimeOffset>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<long>("OrderId")
                .HasColumnType("bigint")
                .HasColumnName("order_id");

            b.Property<string>("Role")
                .IsRequired()
                .HasColumnType("text")
                .HasColumnName("role");

            b.Property<long>("UserId")
                .HasColumnType("bigint")
                .HasColumnName("user_id");

            b.HasKey("Id");

            b.HasIndex("OrderId");

            b.HasIndex("UserId", "OrderId")
                .IsUnique();

            b.ToTable("order_users");
        });

        modelBuilder.Entity("BackHits.Domain.User", b =>
        {
            b.Property<long>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("bigint")
                .HasColumnName("id")
                .HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            b.Property<DateTimeOffset>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("FirstName")
                .HasColumnType("text")
                .HasColumnName("first_name");

            b.Property<string>("Username")
                .HasColumnType("text")
                .HasColumnName("username");

            b.Property<long>("TelegramId")
                .HasColumnType("bigint")
                .HasColumnName("telegram_id");

            b.Property<DateTimeOffset>("UpdatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("updated_at");

            b.HasKey("Id");

            b.HasIndex("TelegramId")
                .IsUnique();

            b.ToTable("users");
        });

        modelBuilder.Entity("BackHits.Domain.OrderUser", b =>
        {
            b.HasOne("BackHits.Domain.Order", "Order")
                .WithMany("OrderUsers")
                .HasForeignKey("OrderId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.HasOne("BackHits.Domain.User", "User")
                .WithMany("OrderUsers")
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.Navigation("Order");
            b.Navigation("User");
        });

        modelBuilder.Entity("BackHits.Domain.Order", b =>
        {
            b.Navigation("OrderUsers");
        });

        modelBuilder.Entity("BackHits.Domain.User", b =>
        {
            b.Navigation("OrderUsers");
        });
    }
}
