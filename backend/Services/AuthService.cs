using System.Security;
using BackHits.Contracts;
using BackHits.Data;
using BackHits.Domain;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly ITelegramInitDataValidator _telegramValidator;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IOrderRealtimeNotifier _realtimeNotifier;

    public AuthService(
        AppDbContext dbContext,
        ITelegramInitDataValidator telegramValidator,
        IJwtTokenService jwtTokenService,
        IOrderRealtimeNotifier realtimeNotifier)
    {
        _dbContext = dbContext;
        _telegramValidator = telegramValidator;
        _jwtTokenService = jwtTokenService;
        _realtimeNotifier = realtimeNotifier;
    }

    public async Task<AuthTelegramResponse> AuthenticateTelegramAsync(AuthTelegramRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.InitData))
        {
            throw new ArgumentException("initData is required.");
        }

        var telegramUser = _telegramValidator.Validate(request.InitData);
        

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(item => item.TelegramId == telegramUser.TelegramId);

        var now = DateTimeOffset.UtcNow;
        if (user is null)
        {
            user = new User
            {
                TelegramId = telegramUser.TelegramId,
                Username = Normalize(telegramUser.Username),
                FirstName = Normalize(telegramUser.FirstName),
                CreatedAt = now,
                UpdatedAt = now
            };
            _dbContext.Users.Add(user);
        }
        else
        {
            user.Username = Normalize(telegramUser.Username);
            user.FirstName = Normalize(telegramUser.FirstName);
            user.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync();

        OrderMembershipResponse? orderResponse = null;
        if (request.OrderId is long orderId)
        {
            var order = await _dbContext.Orders.FirstOrDefaultAsync(item => item.Id == orderId);
            if (order is null)
            {
                throw new OrderNotFoundException(orderId);
            }

            if (order.IsClosed)
            {
                var closedOrderToken = _jwtTokenService.CreateToken(user.Id);
                var closedOrderResponse = new AuthTelegramResponse
                {
                    Token = closedOrderToken,
                    User = UserResponse.From(user),
                    Order = null
                };

                closedOrderResponse.User.PhotoUrl = telegramUser.PhotoUrl;
                return closedOrderResponse;
            }

            var membership = await _dbContext.OrderUsers
                .FirstOrDefaultAsync(item => item.UserId == user.Id && item.OrderId == orderId);

            var added = false;
            if (membership is null)
            {
                membership = new OrderUser
                {
                    UserId = user.Id,
                    OrderId = orderId,
                    Role = OrderRole.Member,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _dbContext.OrderUsers.Add(membership);
                await _dbContext.SaveChangesAsync();
                added = true;
            }

            if (added)
            {
                var createdMembership = await _dbContext.OrderUsers
                    .Include(item => item.User)
                    .FirstAsync(item => item.UserId == user.Id && item.OrderId == orderId);

                await _realtimeNotifier.ParticipantAddedAsync(
                    orderId,
                    user.Id,
                    OrderParticipantResponse.From(createdMembership));
            }

            orderResponse = OrderMembershipResponse.From(order.Id, membership.Role);
        }

        var token = _jwtTokenService.CreateToken(user.Id);
        var response = new AuthTelegramResponse
        {
            Token = token,
            User = UserResponse.From(user),
            Order = orderResponse
        };

        response.User.PhotoUrl = telegramUser.PhotoUrl;

        return response;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
