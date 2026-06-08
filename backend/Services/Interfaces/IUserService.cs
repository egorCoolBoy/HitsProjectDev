using BackHits.Contracts;

namespace BackHits.Services;

public interface IUserService
{
    Task<UserResponse> GetMeAsync(long userId);
}
