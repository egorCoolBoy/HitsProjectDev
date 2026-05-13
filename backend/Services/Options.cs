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
