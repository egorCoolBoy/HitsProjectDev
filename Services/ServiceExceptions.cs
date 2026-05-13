namespace BackHits.Services;

public sealed class OrderNotFoundException : Exception
{
    public OrderNotFoundException(long orderId)
        : base($"Order {orderId} was not found.")
    {
    }
}

public sealed class UserNotFoundException : Exception
{
    public UserNotFoundException(long userId)
        : base($"User {userId} was not found.")
    {
    }
}

public sealed class OrderAccessDeniedException : Exception
{
    public OrderAccessDeniedException(long orderId, long userId)
        : base($"User {userId} has no access to order {orderId}.")
    {
    }
}
