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

public sealed class OrderExpenseNotFoundException : Exception
{
    public OrderExpenseNotFoundException(long expenseId)
        : base($"Order expense {expenseId} was not found.")
    {
    }
}

public sealed class OrderParticipantNotFoundException : Exception
{
    public OrderParticipantNotFoundException(long orderId, long userId)
        : base($"User {userId} is not a participant of order {orderId}.")
    {
    }
}

public sealed class DebtNotFoundException : Exception
{
    public DebtNotFoundException(long debtId)
        : base($"Debt {debtId} was not found.")
    {
    }
}

public sealed class PaymentNotFoundException : Exception
{
    public PaymentNotFoundException(long paymentId)
        : base($"Payment {paymentId} was not found.")
    {
    }
}

public sealed class PaymentAccessDeniedException : Exception
{
    public PaymentAccessDeniedException(long paymentId, long userId)
        : base($"User {userId} cannot manage payment {paymentId}.")
    {
    }
}
