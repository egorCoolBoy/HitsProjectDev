import { useCallback } from 'react';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/apiMappers';
import type { OrderData } from '../types';

type CreateExpenseInput = {
  title: string;
  price: number;
};

/**
 * All order mutations in one place.
 * Expense CRUD uses explicit API calls; portion/title changes use diff-sync.
 */
export function useOrderMutations(
  refreshOrder: (orderId: string) => Promise<OrderData>,
  currentUserId: number | null,
) {
  const currentParticipantId = currentUserId?.toString() ?? 'me';

  const addExpense = useCallback(
    async (orderId: string, payload: CreateExpenseInput) => {
      await orderService.createExpense(parseNumericId(orderId), {
        title: payload.title,
        price: payload.price,
        quantity: 1,
      });
      return refreshOrder(orderId);
    },
    [refreshOrder],
  );

  const deleteExpense = useCallback(
    async (orderId: string, expenseId: string) => {
      await orderService.deleteExpense(parseNumericId(orderId), parseNumericId(expenseId));
      return refreshOrder(orderId);
    },
    [refreshOrder],
  );

  const closeOrder = useCallback(
    async (orderId: string) => {
      await orderService.changeStatus(parseNumericId(orderId), { isClosed: true });
      return refreshOrder(orderId);
    },
    [refreshOrder],
  );

  const syncOrderChanges = useCallback(
    async (currentOrder: OrderData, updatedOrder: OrderData) => {
      const orderId = parseNumericId(updatedOrder.id);

      if (updatedOrder.name !== currentOrder.name) {
        await orderService.changeTitle(orderId, { title: updatedOrder.name });
      }

      for (const item of updatedOrder.items) {
        const currentItem = currentOrder.items.find((i) => i.id === item.id);
        if (!currentItem) continue;

        const expenseId = parseNumericId(item.id);
        if (Number.isNaN(expenseId)) continue;

        const currentShare =
          currentItem.participants.find((p) => p.participantId === currentParticipantId)?.portion ?? 0;
        const updatedShare =
          item.participants.find((p) => p.participantId === currentParticipantId)?.portion ?? 0;

        if (updatedShare !== currentShare) {
          await orderService.toggleExpenseParticipation(orderId, expenseId, updatedShare);
        }
      }

      return refreshOrder(updatedOrder.id);
    },
    [currentParticipantId, refreshOrder],
  );

  return { addExpense, deleteExpense, closeOrder, syncOrderChanges };
}
