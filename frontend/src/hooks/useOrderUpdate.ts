import { useCallback } from 'react';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/calculators';
import type { OrderData } from '../types';

/**
 * Custom hook for updating order and its related data
 */
export function useOrderUpdate(onRefresh: (orderId: string) => Promise<OrderData>) {
  const updateOrder = useCallback(
    async (currentOrder: OrderData, updatedOrder: OrderData) => {
      const orderId = parseNumericId(updatedOrder.id);

      // Update title if changed
      if (updatedOrder.name !== currentOrder.name) {
        await orderService.changeTitle(orderId, { title: updatedOrder.name });
      }

      // Update closed status if changed
      if (updatedOrder.isClosed !== currentOrder.isClosed) {
        await orderService.changeStatus(orderId, { isClosed: updatedOrder.isClosed });
      }

      // Handle items changes
      const currentItemsById = new Map(currentOrder.items.map((item) => [item.id, item]));
      const updatedItemsById = new Map(updatedOrder.items.map((item) => [item.id, item]));

      // Process updated and new items
      for (const item of updatedOrder.items) {
        const currentItem = currentItemsById.get(item.id);
        const numericExpenseId = parseNumericId(item.id);

        if (!currentItem || Number.isNaN(numericExpenseId)) {
          // Create new expense
          await orderService.createExpense(orderId, {
            title: item.name,
            price: item.price,
            quantity: 1,
          });
          continue;
        }

        // Update existing expense if changed
        if (item.name !== currentItem.name || item.price !== currentItem.price) {
          await orderService.updateExpense(orderId, numericExpenseId, {
            title: item.name,
            price: item.price,
            quantity: 1,
          });
        }

        // Update participation
        const currentParticipantId = currentOrder.participants[0]?.id || 'me';
        const currentShare =
          currentItem.participants.find((p) => p.participantId === currentParticipantId)?.portion || 0;
        const updatedShare =
          item.participants.find((p) => p.participantId === currentParticipantId)?.portion || 0;

        if (updatedShare !== currentShare) {
          await orderService.toggleExpenseParticipation(orderId, numericExpenseId, updatedShare);
        }
      }

      // Delete removed items
      for (const item of currentOrder.items) {
        if (!updatedItemsById.has(item.id)) {
          await orderService.deleteExpense(orderId, parseNumericId(item.id));
        }
      }

      // Refresh to get latest state
      return onRefresh(updatedOrder.id);
    },
    [onRefresh],
  );

  return { updateOrder };
}
