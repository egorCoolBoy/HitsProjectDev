import { useCallback, useEffect, useRef, useState } from 'react';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/apiMappers';
import { isClientOnlyOrderUpdate, mergeClientOrderState } from '../utils/orderState';
import { useOrderMutations } from './useOrderMutations';
import type { OrderData } from '../types';
import { UI_MESSAGES } from '../config/constants';

type UseCurrentOrderParams = {
  currentUserId: number | null;
  orderIdFromUrl: number | null;
  ordersLoaded: boolean;
  loadOrder: (orderId: string) => Promise<OrderData>;
  refreshOrder: (orderId: string) => Promise<OrderData>;
};

export function useCurrentOrder({
  currentUserId,
  orderIdFromUrl,
  ordersLoaded,
  loadOrder,
  refreshOrder,
}: UseCurrentOrderParams) {
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const inviteHandled = useRef(false);

  const { addExpense, deleteExpense, closeOrder, syncOrderChanges } = useOrderMutations(
    refreshOrder,
    currentUserId,
  );

  useEffect(() => {
    if (!orderIdFromUrl || inviteHandled.current || !ordersLoaded) return;

    inviteHandled.current = true;
    loadOrder(orderIdFromUrl.toString()).then(setCurrentOrder);
  }, [orderIdFromUrl, ordersLoaded, loadOrder]);

  const applyServerOrder = useCallback(
    (serverOrder: OrderData) => {
      setCurrentOrder((prev) => (prev ? mergeClientOrderState(serverOrder, prev) : serverOrder));
      return serverOrder;
    },
    [],
  );

  const openOrder = useCallback(
    async (orderId: string) => {
      const order = await loadOrder(orderId);
      setCurrentOrder(order);
    },
    [loadOrder],
  );

  const updateOrder = useCallback(
    async (updatedOrder: OrderData) => {
      if (!currentOrder) return;

      if (isClientOnlyOrderUpdate(currentOrder, updatedOrder)) {
        setCurrentOrder(updatedOrder);
        return;
      }

      const refreshed = await syncOrderChanges(currentOrder, updatedOrder);
      setCurrentOrder(mergeClientOrderState(refreshed, updatedOrder));
    },
    [currentOrder, syncOrderChanges],
  );

  const handleAddExpense = useCallback(
    async (payload: { title: string; price: number }) => {
      if (!currentOrder) return;
      const refreshed = await addExpense(currentOrder.id, payload);
      applyServerOrder(refreshed);
    },
    [addExpense, applyServerOrder, currentOrder],
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!currentOrder) return;
      const refreshed = await deleteExpense(currentOrder.id, expenseId);
      applyServerOrder(refreshed);
    },
    [applyServerOrder, currentOrder, deleteExpense],
  );

  const handleCloseOrder = useCallback(async () => {
    if (!currentOrder) return;
    const refreshed = await closeOrder(currentOrder.id);
    applyServerOrder(refreshed);
  }, [applyServerOrder, closeOrder, currentOrder]);

  const handleCreateInviteLink = useCallback(async (orderId: string): Promise<string> => {
    const response = await orderService.createInviteLink(parseNumericId(orderId));
    if (!response.url) {
      throw new Error(UI_MESSAGES.ERROR_BACKEND_NO_URL);
    }
    return response.url;
  }, []);

  return {
    currentOrder,
    isOnHome: !currentOrder,
    openOrder,
    closeOrderView: () => setCurrentOrder(null),
    clearIfDeleted: (orderId: string) => {
      if (currentOrder?.id === orderId) setCurrentOrder(null);
    },
    updateOrder,
    addExpense: handleAddExpense,
    deleteExpense: handleDeleteExpense,
    closeOrder: handleCloseOrder,
    createInviteLink: handleCreateInviteLink,
  };
}
