import { useQuery } from '@tanstack/react-query';
import orderService from '../services/orderService';
import { getParticipantColor } from '../utils/apiMappers';
import type { ApiDebt, DebtSummary, OrderData } from '../types';

export const MY_DEBTS_QUERY_KEY = 'my-debts';

function getUserName(user: ApiDebt['debtor']): string {
  return user.firstName || user.username || `User ${user.id}`;
}

function isSettled(debt: ApiDebt): boolean {
  return debt.status === 'Settled' || debt.status === 2;
}

function mapDebt(debt: ApiDebt, orders: OrderData[]): DebtSummary {
  const order = orders.find((item) => item.id === debt.orderId.toString());

  return {
    orderId: debt.orderId.toString(),
    orderName: order?.name ?? `Order ${debt.orderId}`,
    creditorId: debt.creditorId.toString(),
    creditorName: getUserName(debt.creditor),
    creditorColor: getParticipantColor(debt.creditorId.toString()),
    debtorId: debt.debtorId.toString(),
    debtorName: getUserName(debt.debtor),
    debtorColor: getParticipantColor(debt.debtorId.toString()),
    amount: debt.amount,
    settled: isSettled(debt),
  };
}

export function useMyDebts(currentUserId: number | null, orders: OrderData[]) {
  const query = useQuery({
    queryKey: [MY_DEBTS_QUERY_KEY, currentUserId],
    queryFn: () => orderService.getMyDebts(),
    enabled: !!currentUserId,
  });

  return {
    ...query,
    data: query.data
      ? {
          myDebts: query.data.owedByMe.map((debt) => mapDebt(debt, orders)),
          myCredits: query.data.owedToMe.map((debt) => mapDebt(debt, orders)),
        }
      : undefined,
  };
}
