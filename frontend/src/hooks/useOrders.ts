import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import orderService from '../services/orderService';
import { mapOrderToData, parseNumericId } from '../utils/apiMappers';
import type { OrderData } from '../types';

export const ORDERS_QUERY_KEY = 'orders';

/**
 * Read-only orders list and cache management.
 * Mutations live in useOrderMutations / useCurrentOrder.
 */
export function useOrders(currentUserId: number | null) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: [ORDERS_QUERY_KEY, currentUserId],
    queryFn: async () => {
      const apiOrders = await orderService.list();
      return apiOrders.map((order) => mapOrderToData(order, currentUserId));
    },
    enabled: !!currentUserId,
  });

  const loadOrder = useCallback(
    async (orderId: string): Promise<OrderData> => {
      const numericOrderId = parseNumericId(orderId);
      const [apiOrder, expenses, payments] = await Promise.all([
        orderService.getById(numericOrderId),
        orderService.listExpenses(numericOrderId),
        orderService.listPayments(numericOrderId),
      ]);
      return mapOrderToData(apiOrder, currentUserId, expenses, payments);
    },
    [currentUserId],
  );

  const refreshOrder = useCallback(
    async (orderId: string): Promise<OrderData> => {
      const order = await loadOrder(orderId);
      queryClient.setQueryData<OrderData[]>([ORDERS_QUERY_KEY, currentUserId], (current) =>
        current?.map((item) => (item.id === order.id ? order : item)) ?? current,
      );
      return order;
    },
    [currentUserId, loadOrder, queryClient],
  );

  const createOrder = useCallback(
    async (title: string) => {
      const createdOrder = await orderService.create({ title });
      const mappedOrder = mapOrderToData(createdOrder, currentUserId);
      queryClient.setQueryData<OrderData[]>([ORDERS_QUERY_KEY, currentUserId], (current) => [
        mappedOrder,
        ...(current ?? []),
      ]);
      return mappedOrder;
    },
    [currentUserId, queryClient],
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      await orderService.delete(parseNumericId(orderId));
      queryClient.setQueryData<OrderData[]>([ORDERS_QUERY_KEY, currentUserId], (current) =>
        current?.filter((order) => order.id !== orderId) ?? current,
      );
    },
    [currentUserId, queryClient],
  );

  const patchOrder = useCallback(
    (orderId: string, patch: Partial<OrderData>) => {
      queryClient.setQueryData<OrderData[]>([ORDERS_QUERY_KEY, currentUserId], (current) =>
        current?.map((order) => (order.id === orderId ? { ...order, ...patch } : order)) ?? current,
      );
    },
    [currentUserId, queryClient],
  );

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    loadOrder,
    refreshOrder,
    createOrder,
    deleteOrder,
    patchOrder,
  };
}
