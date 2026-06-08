namespace BackHits.Services;

public interface IJwtTokenService
{
    string CreateToken(long userId);
}
