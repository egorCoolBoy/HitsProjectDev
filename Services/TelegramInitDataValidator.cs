using System.Globalization;
using System.Security;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace BackHits.Services;

public interface ITelegramInitDataValidator
{
    TelegramUserInfo Validate(string initData);
}

public sealed record TelegramUserInfo(long TelegramId, string? Username, string? FirstName);

public sealed class TelegramInitDataValidator : ITelegramInitDataValidator
{
    private readonly TelegramOptions _options;

    public TelegramInitDataValidator(IOptions<TelegramOptions> options)
    {
        _options = options.Value;
    }

    public TelegramUserInfo Validate(string initData)
    {
        if (string.IsNullOrWhiteSpace(_options.BotToken))
        {
            throw new InvalidOperationException("Telegram:BotToken is required.");
        }

        if (string.IsNullOrWhiteSpace(initData))
        {
            throw new SecurityException("initData is empty.");
        }

        var values = ParseInitData(initData);
        if (!values.TryGetValue("hash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
        {
            throw new SecurityException("Telegram initData hash is missing.");
        }

        ValidateFreshness(values);

        var dataCheckString = string.Join(
            '\n',
            values
                .Where(item => item.Key != "hash")
                .OrderBy(item => item.Key, StringComparer.Ordinal)
                .Select(item => $"{item.Key}={item.Value}"));

        using var secretKeyAlgorithm = new HMACSHA256(Encoding.UTF8.GetBytes(_options.BotToken));
        var secretKey = secretKeyAlgorithm.ComputeHash(Encoding.UTF8.GetBytes("WebAppData"));

        using var signatureAlgorithm = new HMACSHA256(secretKey);
        var computedHash = signatureAlgorithm.ComputeHash(Encoding.UTF8.GetBytes(dataCheckString));
        var computedHashHex = Convert.ToHexString(computedHash).ToLowerInvariant();

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(receivedHash.Trim().ToLowerInvariant()),
                Encoding.UTF8.GetBytes(computedHashHex)))
        {
            throw new SecurityException("Telegram initData signature is invalid.");
        }

        if (!values.TryGetValue("user", out var userJson) || string.IsNullOrWhiteSpace(userJson))
        {
            throw new SecurityException("Telegram initData user payload is missing.");
        }

        var user = JsonSerializer.Deserialize<TelegramUserPayload>(userJson, JsonSerializerOptions);
        if (user is null)
        {
            throw new SecurityException("Telegram initData user payload is invalid.");
        }

        return new TelegramUserInfo(user.Id, user.Username, user.FirstName);
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private static Dictionary<string, string> ParseInitData(string initData)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        var parts = initData.Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var part in parts)
        {
            var index = part.IndexOf('=');
            if (index <= 0)
            {
                continue;
            }

            var key = Uri.UnescapeDataString(part[..index]);
            var value = Uri.UnescapeDataString(part[(index + 1)..]);
            result[key] = value;
        }

        return result;
    }

    private void ValidateFreshness(Dictionary<string, string> values)
    {
        if (_options.InitDataMaxAgeMinutes <= 0)
        {
            return;
        }

        if (!values.TryGetValue("auth_date", out var authDateValue) || !long.TryParse(authDateValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var authDateUnixSeconds))
        {
            throw new SecurityException("Telegram initData auth_date is missing or invalid.");
        }

        var authDate = DateTimeOffset.FromUnixTimeSeconds(authDateUnixSeconds);
        if (DateTimeOffset.UtcNow - authDate > TimeSpan.FromMinutes(_options.InitDataMaxAgeMinutes))
        {
            throw new SecurityException("Telegram initData has expired.");
        }
    }

    private sealed class TelegramUserPayload
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
    }
}
