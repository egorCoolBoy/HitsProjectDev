using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace BackHits.Services;

public sealed class ProverkachekaReceiptCheckClient : IReceiptCheckClient
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly ProverkachekaOptions _options;

    public ProverkachekaReceiptCheckClient(HttpClient httpClient, IOptions<ProverkachekaOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<ReceiptCheckItem>> GetItemsFromReceiptImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Token))
        {
            throw new ReceiptImportException("Proverkacheka token is not configured.");
        }

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(_options.Token), "token");

        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType);
        form.Add(fileContent, "qrfile", string.IsNullOrWhiteSpace(file.FileName) ? "receipt.jpg" : file.FileName);

        using var response = await _httpClient.PostAsync("/api/v1/check/get", form, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var receipt = await JsonSerializer.DeserializeAsync<ProverkachekaResponse>(responseStream, SerializerOptions, cancellationToken);
        if (receipt is null)
        {
            throw new ReceiptImportException("Receipt API returned an empty response.");
        }

        if (receipt.Code != 1)
        {
            throw new ReceiptImportException(GetApiErrorMessage(receipt.Code));
        }

        var items = receipt.Data?.Json?.Items;
        if (items is null || items.Count == 0)
        {
            throw new ReceiptImportException("Receipt API did not return any items.");
        }

        return items
            .Where(item => !string.IsNullOrWhiteSpace(item.Name) && item.Sum > 0 && item.Quantity > 0)
            .Select(item => new ReceiptCheckItem(
                item.Name!.Trim(),
                GetItemPrice(item),
                decimal.Round(item.Quantity, 3)))
            .ToList();
    }

    private static decimal GetItemPrice(ProverkachekaItem item)
    {
        if (item.Price > 0)
        {
            return decimal.Round(item.Price / 100m, 2);
        }

        return decimal.Round(item.Sum / item.Quantity / 100m, 2);
    }

    private static string GetApiErrorMessage(int code)
    {
        return code switch
        {
            0 => "Receipt is invalid.",
            2 => "Receipt data is not ready yet.",
            3 => "Receipt API request limit exceeded.",
            4 => "Receipt API asked to wait before retrying.",
            _ => "Receipt data was not received."
        };
    }

    private sealed class ProverkachekaResponse
    {
        [JsonPropertyName("code")]
        public int Code { get; set; }

        [JsonPropertyName("data")]
        public ProverkachekaData? Data { get; set; }
    }

    private sealed class ProverkachekaData
    {
        [JsonPropertyName("json")]
        public ProverkachekaJson? Json { get; set; }
    }

    private sealed class ProverkachekaJson
    {
        [JsonPropertyName("items")]
        public IReadOnlyList<ProverkachekaItem> Items { get; set; } = Array.Empty<ProverkachekaItem>();
    }

    private sealed class ProverkachekaItem
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("price")]
        public decimal Price { get; set; }

        [JsonPropertyName("quantity")]
        public decimal Quantity { get; set; }

        [JsonPropertyName("sum")]
        public decimal Sum { get; set; }
    }
}
