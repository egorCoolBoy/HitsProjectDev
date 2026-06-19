import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { splitItemEvenly, updateParticipantPortion } from '../utils/orderEdits';
import type { OrderData } from '../types';

type OrderContextValue = {
  order: OrderData;
  isClosed: boolean;
  updatePortion: (itemId: string, participantId: string, portion: number) => void;
  splitItemEvenly: (itemId: string) => void;
  requestDeleteItem: (itemId: string) => void;
  requestEditItem: (itemId: string) => void;
};

const OrderContext = createContext<OrderContextValue | null>(null);

type OrderProviderProps = {
  order: OrderData;
  onUpdateOrder: (order: OrderData) => void;
  onRequestDeleteItem: (itemId: string) => void;
  onRequestEditItem: (itemId: string) => void;
  onClosedAction: () => void;
  children: ReactNode;
};

export function OrderProvider({
  order,
  onUpdateOrder,
  onRequestDeleteItem,
  onRequestEditItem,
  onClosedAction,
  children,
}: OrderProviderProps) {
  const updatePortion = useCallback(
    (itemId: string, participantId: string, portion: number) => {
      onUpdateOrder({
        ...order,
        items: updateParticipantPortion(order.items, itemId, participantId, portion),
      });
    },
    [onUpdateOrder, order],
  );

  const splitEvenly = useCallback(
    (itemId: string) => {
      if (order.isClosed) {
        onClosedAction();
        return;
      }
      onUpdateOrder({
        ...order,
        items: splitItemEvenly(order.items, itemId, order.participants),
      });
    },
    [onClosedAction, onUpdateOrder, order],
  );

  const requestDeleteItem = useCallback(
    (itemId: string) => {
      if (order.isClosed) {
        onClosedAction();
        return;
      }
      onRequestDeleteItem(itemId);
    },
    [onClosedAction, onRequestDeleteItem, order.isClosed],
  );

  const requestEditItem = useCallback(
    (itemId: string) => {
      if (order.isClosed) {
        onClosedAction();
        return;
      }
      onRequestEditItem(itemId);
    },
    [onClosedAction, onRequestEditItem, order.isClosed],
  );

  const value = useMemo<OrderContextValue>(
    () => ({
      order,
      isClosed: order.isClosed,
      updatePortion,
      splitItemEvenly: splitEvenly,
      requestDeleteItem,
      requestEditItem,
    }),
    [order, splitEvenly, requestDeleteItem, requestEditItem, updatePortion],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrderContext(): OrderContextValue {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within OrderProvider');
  }
  return context;
}
