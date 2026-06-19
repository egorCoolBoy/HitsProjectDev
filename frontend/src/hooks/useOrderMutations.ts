import { useCallback } from 'react';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/apiMappers';
import { portionsEqual, toParticipationPayload } from '../utils/participationSync';
import type { OrderData, OrderItem } from '../types';

export type ExpenseInput = {
  title: string;
  price: number;
  quantity: number;
};

async function syncItemPortions(
  orderId: number,
  currentItem: OrderItem,
  updatedItem: OrderItem,
) {
  if (portionsEqual(currentItem.participants, updatedItem.participants)) return;

  const expenseId = parseNumericId(updatedItem.id);
  if (Number.isNaN(expenseId)) return;

  await orderService.setExpenseParticipations(
    orderId,
    expenseId,
    toParticipationPayload(updatedItem.participants),
  );
}

/**
 * All order mutations in one place.
 */
export function useOrderMutations(refreshOrder: (orderId: string) => Promise<OrderData>) {
  const addExpense = useCallback(
    async (orderId: string, payload: ExpenseInput) => {
      await orderService.createExpense(parseNumericId(orderId), {
        title: payload.title,
        price: payload.price,
        quantity: payload.quantity,
      });
      return refreshOrder(orderId);
    },
    [refreshOrder],
  );

  const updateExpense = useCallback(
    async (orderId: string, expenseId: string, payload: ExpenseInput) => {
      await orderService.updateExpense(parseNumericId(orderId), parseNumericId(expenseId), {
        title: payload.title,
        price: payload.price,
        quantity: payload.quantity,
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

  const closeOrder = useCallback(async (orderId: string) => {
    await orderService.changeStatus(parseNumericId(orderId), { isClosed: true });
  }, []);

  const syncOrderChanges = useCallback(
    async (currentOrder: OrderData, updatedOrder: OrderData) => {
      const orderId = parseNumericId(updatedOrder.id);

      if (updatedOrder.name !== currentOrder.name) {
        await orderService.changeTitle(orderId, { title: updatedOrder.name });
      }

      for (const item of updatedOrder.items) {
        const currentItem = currentOrder.items.find((candidate) => candidate.id === item.id);
        if (!currentItem) continue;
        await syncItemPortions(orderId, currentItem, item);
      }

      return refreshOrder(updatedOrder.id);
    },
    [refreshOrder],
  );

  return { addExpense, updateExpense, deleteExpense, closeOrder, syncOrderChanges };
}
