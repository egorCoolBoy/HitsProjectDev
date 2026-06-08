namespace BackHits.Services;

public interface ITelegramInitDataValidator
{
    TelegramUserInfo Validate(string initData);
}
