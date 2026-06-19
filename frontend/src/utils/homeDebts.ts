import { calculateDebts } from './orderCalculations';
import type { DebtSummary, OrderData } from '../types';

export function collectUserDebts(
  orders: OrderData[],
  currentUserId: number | null,
): { myDebts: DebtSummary[]; myCredits: DebtSummary[] } {
  if (!currentUserId) return { myDebts: [], myCredits: [] };

  const userId = currentUserId.toString();
  const allDebts: DebtSummary[] = [];

  for (const order of orders.filter((o) => o.isClosed)) {
    const debts = calculateDebts(order);
    allDebts.push(
      ...debts.map((debt) => ({
        orderId: order.id,
        orderName: order.name,
        creditorId: debt.toId,
        creditorName: debt.toName,
        creditorColor: debt.toColor,
        debtorId: debt.fromId,
        debtorName: debt.fromName,
        debtorColor: debt.fromColor,
        amount: debt.amount,
        settled: debt.settled,
      })),
    );
  }

  return {
    myDebts: allDebts.filter((debt) => debt.debtorId === userId && !debt.settled),
    myCredits: allDebts.filter((debt) => debt.creditorId === userId && !debt.settled),
  };
}
