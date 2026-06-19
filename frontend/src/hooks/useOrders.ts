import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import orderService from '../services/orderService';
import { mapOrderToData, parseNumericId } from '../utils/calculators';
import type { OrderData, UserProfile } from '../types';

const ORDERS_QUERY_KEY = 'orders';

/**
 * Custom hook for managing orders
 */
export function useOrders(userProfile: UserProfile, currentUserId: number | null) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: [ORDERS_QUERY_KEY, userProfile.name],
    queryFn: async () => {
      const apiOrders = await orderService.list();
      return apiOrders.map((order) => mapOrderToData(order, currentUserId));
    },
    enabled: !!currentUserId,
  });

  const loadOrder = useCallback(
    async (orderId: string): Promise<OrderData> => {
      const numericOrderId = parseNumericId(orderId);
      const [apiOrder, expenses] = await Promise.all([
        orderService.getById(numericOrderId),
        orderService.listExpenses(numericOrderId),
      ]);
      return mapOrderToData(apiOrder, currentUserId, expenses);
    },
    [currentUserId, userProfile],
  );

  const refreshOrder = useCallback(
    async (orderId: string): Promise<OrderData> => {
      const order = await loadOrder(orderId);
      queryClient.setQueryData<OrderData[]>(
        [ORDERS_QUERY_KEY, userProfile.name],
        (current) => current?.map((item) => (item.id === order.id ? order : item)) ?? current,
      );
      return order;
    },
    [loadOrder, queryClient, userProfile.name],
  );

  const createOrder = useCallback(
    async (order: OrderData) => {
      const createdOrder = await orderService.create({ title: order.name });
      const mappedOrder = mapOrderToData(createdOrder, currentUserId);
      queryClient.setQueryData<OrderData[]>(
        [ORDERS_QUERY_KEY, userProfile.name],
        (current) => [mappedOrder, ...(current ?? [])],
      );
      return mappedOrder;
    },
    [currentUserId, queryClient, userProfile],
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      await orderService.delete(parseNumericId(orderId));
      queryClient.setQueryData<OrderData[]>(
        [ORDERS_QUERY_KEY, userProfile.name],
        (current) => current?.filter((order) => order.id !== orderId) ?? current,
      );
    },
    [queryClient, userProfile.name],
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
  };
}
