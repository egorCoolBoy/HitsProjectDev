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

function toPaymentsPayload(order: OrderData) {
  return order.participants.map((participant) => {
    const payment = order.payments.find((item) => item.participantId === participant.id);

    return {
      userId: parseNumericId(participant.id),
      paidAmount: payment?.amount ?? 0,
    };
  });
}

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

  const importReceipt = useCallback(
    async (orderId: string, file: File) => {
      await orderService.importReceipt(parseNumericId(orderId), file);
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

  const updatePayment = useCallback(
    async (orderId: string, participantId: string, amount: number) => {
      await orderService.upsertPayment(parseNumericId(orderId), {
        userId: parseNumericId(participantId),
        amount,
      });
      return refreshOrder(orderId);
    },
    [refreshOrder],
  );

  const closeOrder = useCallback(
    async (order: OrderData) => {
      await orderService.calculateDebts(parseNumericId(order.id), {
        payments: toPaymentsPayload(order),
      });
      await orderService.changeStatus(parseNumericId(order.id), { isClosed: true });
    },
    [],
  );

  const recalculateDebts = useCallback(async (order: OrderData) => {
    await orderService.calculateDebts(parseNumericId(order.id), {
      payments: toPaymentsPayload(order),
    });
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

  return {
    addExpense,
    importReceipt,
    updateExpense,
    deleteExpense,
    updatePayment,
    closeOrder,
    recalculateDebts,
    syncOrderChanges,
  };
}
