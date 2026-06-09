import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Home } from '../components/Home';
import { Order } from '../components/Order';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import orderService, { type ApiOrder, type ApiOrderExpense } from '../services/orderService';

export type Participant = {
  id: string;
  name: string;
  color: string;
};

export type ParticipantPortion = {
  participantId: string;
  portion: number;
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  participants: ParticipantPortion[];
};

export type Payment = {
  participantId: string;
  amount: number;
};

export type DebtSettlement = {
  debtorId: string;
  settled: boolean;
};

export type OrderData = {
  id: string;
  name: string;
  participants: Participant[];
  items: OrderItem[];
  createdAt: number;
  payments: Payment[];
  isClosed: boolean;
  settlements: DebtSettlement[];
};

export type UserProfile = {
  name: string;
  avatar: string;
};

const DEFAULT_USER: UserProfile = { name: 'Пользователь', avatar: '👤' };
const CURRENT_USER_COLOR = '#FF6B6B';

const queryClient = new QueryClient();

function toNumberId(id: string) {
  return Number.parseInt(id, 10);
}

function createCurrentParticipant(userProfile: UserProfile): Participant {
  return {
    id: 'me',
    name: userProfile.name,
    color: CURRENT_USER_COLOR,
  };
}

function mapExpenseToItem(expense: ApiOrderExpense): OrderItem {
  return {
    id: expense.id.toString(),
    name: expense.title || 'Позиция',
    price: expense.totalPrice || expense.price * expense.quantity,
    participants: expense.isParticipating ? [{ participantId: 'me', portion: 1 }] : [],
  };
}

function mapOrderToData(order: ApiOrder, userProfile: UserProfile, expenses: ApiOrderExpense[] = []): OrderData {
  return {
    id: order.id.toString(),
    name: order.title || 'Новый заказ',
    participants: [createCurrentParticipant(userProfile)],
    items: expenses.map(mapExpenseToItem),
    createdAt: new Date(order.createdAt).getTime(),
    payments: [],
    isClosed: order.isClosed,
    settlements: [],
  };
}

function AppContent() {
  const { initData, user } = useTelegram();
  const orderIdFromUrl = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('orderId');
    if (!value) return null;

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);
  const auth = useAuth(initData, orderIdFromUrl);
  const userProfile: UserProfile = useMemo(
    () => ({
      ...DEFAULT_USER,
      name: user?.first_name || user?.username || DEFAULT_USER.name,
    }),
    [user?.first_name, user?.username],
  );

  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const queryClientHook = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ['orders', userProfile.name],
    queryFn: async () => {
      const apiOrders = await orderService.list();
      return apiOrders.map((order) => mapOrderToData(order, userProfile));
    },
    enabled: auth.isSuccess,
  });

  const loadOrder = useCallback(
    async (orderId: string) => {
      const numericOrderId = toNumberId(orderId);
      const [apiOrder, expenses] = await Promise.all([
        orderService.getById(numericOrderId),
        orderService.listExpenses(numericOrderId),
      ]);
      return mapOrderToData(apiOrder, userProfile, expenses);
    },
    [userProfile],
  );

  const refreshCurrentOrder = useCallback(
    async (orderId: string) => {
      const order = await loadOrder(orderId);
      setCurrentOrder(order);
      queryClientHook.setQueryData<OrderData[]>(['orders', userProfile.name], (current) =>
        current?.map((item) => (item.id === order.id ? order : item)) ?? current,
      );
      return order;
    },
    [loadOrder, queryClientHook, userProfile.name],
  );

  const handleCreateOrder = async (order: OrderData) => {
    const createdOrder = await orderService.create({ title: order.name });
    const mappedOrder = mapOrderToData(createdOrder, userProfile);
    queryClientHook.setQueryData<OrderData[]>(['orders', userProfile.name], (current) => [mappedOrder, ...(current ?? [])]);
    setCurrentOrder(mappedOrder);
  };

  const handleUpdateOrder = async (updatedOrder: OrderData) => {
    if (!currentOrder) return;

    const orderId = toNumberId(updatedOrder.id);

    if (updatedOrder.name !== currentOrder.name) {
      await orderService.changeTitle(orderId, { title: updatedOrder.name });
    }

    if (updatedOrder.isClosed !== currentOrder.isClosed) {
      await orderService.changeStatus(orderId, { isClosed: updatedOrder.isClosed });
    }

    const currentItemsById = new Map(currentOrder.items.map((item) => [item.id, item]));
    const updatedItemsById = new Map(updatedOrder.items.map((item) => [item.id, item]));

    for (const item of updatedOrder.items) {
      const currentItem = currentItemsById.get(item.id);
      const numericExpenseId = toNumberId(item.id);

      if (!currentItem || Number.isNaN(numericExpenseId)) {
        await orderService.createExpense(orderId, {
          title: item.name,
          price: item.price,
          quantity: 1,
        });
        continue;
      }

      if (item.name !== currentItem.name || item.price !== currentItem.price) {
        await orderService.updateExpense(orderId, numericExpenseId, {
          title: item.name,
          price: item.price,
          quantity: 1,
        });
      }

      const currentShare = currentItem.participants.find((participant) => participant.participantId === 'me')?.portion || 0;
      const updatedShare = item.participants.find((participant) => participant.participantId === 'me')?.portion || 0;
      if (updatedShare !== currentShare) {
        await orderService.toggleExpenseParticipation(orderId, numericExpenseId, updatedShare);
      }
    }

    for (const item of currentOrder.items) {
      if (!updatedItemsById.has(item.id)) {
        await orderService.deleteExpense(orderId, toNumberId(item.id));
      }
    }

    await refreshCurrentOrder(updatedOrder.id);
  };

  const handleOpenOrder = async (orderId: string) => {
    const order = await loadOrder(orderId);
    setCurrentOrder(order);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await orderService.delete(toNumberId(orderId));
    queryClientHook.setQueryData<OrderData[]>(['orders', userProfile.name], (current) =>
      current?.filter((order) => order.id !== orderId) ?? current,
    );
    if (currentOrder?.id === orderId) {
      setCurrentOrder(null);
    }
  };

  if (auth.isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-gray-600">
        Загрузка...
      </div>
    );
  }

  if (auth.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-red-600">
        Ошибка авторизации: {auth.error.message}
      </div>
    );
  }

  if (ordersQuery.isLoading && !currentOrder) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-gray-600">
        Загружаем заказы...
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-red-600">
        {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Не удалось загрузить заказы'}
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="size-full bg-[#f5f5f5]">
      {!currentOrder ? (
        <Home
          userProfile={userProfile}
          orders={orders}
          onCreateOrder={handleCreateOrder}
          onOpenOrder={handleOpenOrder}
          onDeleteOrder={handleDeleteOrder}
        />
      ) : (
        <Order order={currentOrder} onUpdateOrder={handleUpdateOrder} onBack={() => setCurrentOrder(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
