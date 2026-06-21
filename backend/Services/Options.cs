namespace BackHits.Services;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public string Key { get; set; } = string.Empty;

    public int AccessTokenLifetimeMinutes { get; set; } = 60;
}

public sealed class TelegramOptions
{
    public string BotToken { get; set; } = string.Empty;

    public string BotUsername { get; set; } = string.Empty;

    public int InitDataMaxAgeMinutes { get; set; } = 1440;
}

public sealed class ProverkachekaOptions
{
    public string Token { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://proverkacheka.com";

    public long MaxReceiptImageBytes { get; set; } = 25 * 1024 * 1024;
}
