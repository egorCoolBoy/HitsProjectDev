import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Home } from '../components/Home';
import { Order } from '../components/Order';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

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

const STORAGE_KEYS = {
  ORDERS: 'splitbot_orders',
};

const DEFAULT_USER: UserProfile = { name: 'Пользователь', avatar: '👤' };

const queryClient = new QueryClient();

function AppContent() {
  const { initData, user } = useTelegram();
  const auth = useAuth(initData);
  const userProfile: UserProfile = {
    ...DEFAULT_USER,
    name: user?.first_name || user?.username || DEFAULT_USER.name,
  };

  const [orders, setOrders] = useState<OrderData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  const handleCreateOrder = (order: OrderData) => {
    setOrders([order, ...orders]);
    setCurrentOrder(order);
  };

  const handleUpdateOrder = (updatedOrder: OrderData) => {
    setOrders(orders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    setCurrentOrder(updatedOrder);
  };

  const handleOpenOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (order) {
      setCurrentOrder(order);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(orders.filter((order) => order.id !== orderId));
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
