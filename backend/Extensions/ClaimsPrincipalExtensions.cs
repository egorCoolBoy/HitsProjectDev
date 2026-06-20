using System.Security.Claims;
using System.Security;

namespace BackHits.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static long GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!long.TryParse(value, out var userId))
        {
            throw new SecurityException("Authenticated user id is missing.");
        }

        return userId;
    }
}
