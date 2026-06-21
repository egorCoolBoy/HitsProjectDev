using Microsoft.AspNetCore.Http;

namespace BackHits.Services;

public interface IReceiptCheckClient
{
    Task<IReadOnlyList<ReceiptCheckItem>> GetItemsFromReceiptImageAsync(IFormFile file, CancellationToken cancellationToken);
}

public sealed record ReceiptCheckItem(string Name, decimal Total);
