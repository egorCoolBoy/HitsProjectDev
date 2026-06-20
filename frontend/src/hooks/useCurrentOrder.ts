import { useCallback, useEffect, useRef, useState } from 'react';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/apiMappers';
import { mergeClientOrderState, shouldSkipApiSync } from '../utils/orderState';
import { useOrderMutations } from './useOrderMutations';
import { useOrderRealtime } from './useOrderRealtime';
import type { ExpenseInput } from './useOrderMutations';
import type { OrderData } from '../types';
import { UI_MESSAGES } from '../config/constants';

type UseCurrentOrderParams = {
  orderIdFromUrl: number | null;
  ordersLoaded: boolean;
  loadOrder: (orderId: string) => Promise<OrderData>;
  refreshOrder: (orderId: string) => Promise<OrderData>;
  patchOrder: (orderId: string, patch: Partial<OrderData>) => void;
  onDebtsChanged?: () => void;
};

export function useCurrentOrder({
  orderIdFromUrl,
  ordersLoaded,
  loadOrder,
  refreshOrder,
  patchOrder,
  onDebtsChanged,
}: UseCurrentOrderParams) {
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const inviteHandled = useRef(false);

  const { addExpense, updateExpense, deleteExpense, updatePayment, closeOrder, syncOrderChanges } =
    useOrderMutations(refreshOrder);
  const currentOrderId = currentOrder?.id ?? null;

  const handleRealtimeOrderChanged = useCallback(() => {
    if (!currentOrderId) return;

    refreshOrder(currentOrderId)
      .then((order) => {
        setCurrentOrder((latest) => (latest?.id === order.id ? order : latest));
        onDebtsChanged?.();
      })
      .catch((error) => {
        console.warn('Failed to refresh order after realtime event', error);
      });
  }, [currentOrderId, onDebtsChanged, refreshOrder]);

  useOrderRealtime({
    orderId: currentOrderId,
    enabled: !!currentOrder && !currentOrder.isClosed,
    onOrderChanged: handleRealtimeOrderChanged,
  });

  useEffect(() => {
    if (!orderIdFromUrl || inviteHandled.current || !ordersLoaded) return;

    inviteHandled.current = true;
    loadOrder(orderIdFromUrl.toString()).then(setCurrentOrder);
  }, [orderIdFromUrl, ordersLoaded, loadOrder]);

  const applyServerOrder = useCallback((serverOrder: OrderData) => {
    setCurrentOrder((prev) => (prev ? mergeClientOrderState(serverOrder, prev) : serverOrder));
    return serverOrder;
  }, []);

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

      if (shouldSkipApiSync(currentOrder, updatedOrder)) {
        setCurrentOrder(updatedOrder);
        return;
      }

      const refreshed = await syncOrderChanges(currentOrder, updatedOrder);
      setCurrentOrder(mergeClientOrderState(refreshed, updatedOrder));
    },
    [currentOrder, syncOrderChanges],
  );

  const handleAddExpense = useCallback(
    async (payload: ExpenseInput) => {
      if (!currentOrder) return;
      const refreshed = await addExpense(currentOrder.id, payload);
      applyServerOrder(refreshed);
    },
    [addExpense, applyServerOrder, currentOrder],
  );

  const handleUpdateExpense = useCallback(
    async (expenseId: string, payload: ExpenseInput) => {
      if (!currentOrder) return;
      const refreshed = await updateExpense(currentOrder.id, expenseId, payload);
      applyServerOrder(refreshed);
    },
    [applyServerOrder, currentOrder, updateExpense],
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      if (!currentOrder) return;
      const refreshed = await deleteExpense(currentOrder.id, expenseId);
      applyServerOrder(refreshed);
    },
    [applyServerOrder, currentOrder, deleteExpense],
  );

  const handleUpdatePayment = useCallback(
    async (participantId: string, amount: number) => {
      if (!currentOrder) return;
      const refreshed = await updatePayment(currentOrder.id, participantId, amount);
      applyServerOrder(refreshed);
    },
    [applyServerOrder, currentOrder, updatePayment],
  );

  const handleCloseOrder = useCallback(async () => {
    if (!currentOrder) return;
    await closeOrder(currentOrder);
    setCurrentOrder((prev) => (prev ? { ...prev, isClosed: true } : null));
    patchOrder(currentOrder.id, { isClosed: true });
    onDebtsChanged?.();
  }, [closeOrder, currentOrder, onDebtsChanged, patchOrder]);

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
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
    updatePayment: handleUpdatePayment,
    closeOrder: handleCloseOrder,
    createInviteLink: handleCreateInviteLink,
  };
}
