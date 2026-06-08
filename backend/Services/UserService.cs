using BackHits.Contracts;
using BackHits.Data;
using Microsoft.EntityFrameworkCore;

namespace BackHits.Services;

public sealed class UserService : IUserService
{
    private readonly AppDbContext _dbContext;

    public UserService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserResponse> GetMeAsync(long userId)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(item => item.Id == userId);
        if (user is null)
        {
            throw new UserNotFoundException(userId);
        }

        return UserResponse.From(user);
    }
}
