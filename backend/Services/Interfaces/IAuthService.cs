using BackHits.Contracts;

namespace BackHits.Services;

public interface IAuthService
{
    Task<AuthTelegramResponse> AuthenticateTelegramAsync(AuthTelegramRequest request);
}
