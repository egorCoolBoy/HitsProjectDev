using System.Globalization;
using System.Security;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<TelegramInitDataValidator> _logger;

    public TelegramInitDataValidator(IOptions<TelegramOptions> options, ILogger<TelegramInitDataValidator> logger)
    {
        _options = options.Value;
        _logger = logger;
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

        _logger.LogInformation("Telegram debug: bot username={BotUsername}, bot token={BotToken}", _options.BotUsername, MaskToken(_options.BotToken));
        _logger.LogInformation("Telegram debug: raw initData={InitData}", initData);

        var values = ParseInitData(initData);
        _logger.LogInformation("Parsed initData params: {Params}", string.Join(", ", values.Keys));
        _logger.LogInformation("Telegram debug: parsed values={Values}", string.Join(" | ", values.Select(item => $"{item.Key}={item.Value}")));
        
        if (!values.TryGetValue("hash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
        {
            throw new SecurityException("Telegram initData hash is missing.");
        }

        _logger.LogInformation("Received hash: {Hash}", receivedHash);

        ValidateFreshness(values);

        var dataCheckString = string.Join(
            '\n',
            values
                .Where(item => item.Key != "hash" && item.Key != "signature")
                .OrderBy(item => item.Key, StringComparer.Ordinal)
                .Select(item => $"{item.Key}={item.Value}"));

        _logger.LogInformation("DataCheckString: {DataCheckString}", dataCheckString);
        _logger.LogInformation("Telegram debug: auth_date={AuthDate}", values.TryGetValue("auth_date", out var authDateValue) ? authDateValue : "<missing>");

        using var secretKeyHmac = new HMACSHA256(Encoding.UTF8.GetBytes("WebAppData"));
        var secretKey = secretKeyHmac.ComputeHash(Encoding.UTF8.GetBytes(_options.BotToken));

        using var signatureAlgorithm = new HMACSHA256(secretKey);
        var computedHash = signatureAlgorithm.ComputeHash(Encoding.UTF8.GetBytes(dataCheckString));
        var computedHashHex = Convert.ToHexString(computedHash).ToLowerInvariant();

        _logger.LogInformation("Computed hash: {ComputedHash}", computedHashHex);

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(receivedHash.Trim().ToLowerInvariant()),
                Encoding.UTF8.GetBytes(computedHashHex)))
        {
            _logger.LogWarning("Hash mismatch! Expected: {Expected}, Got: {Got}", computedHashHex, receivedHash);
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

    private static string MaskToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return "<empty>";
        }

        if (token.Length <= 8)
        {
            return new string('*', token.Length);
        }

        return $"{token[..4]}...{token[^4..]}";
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
