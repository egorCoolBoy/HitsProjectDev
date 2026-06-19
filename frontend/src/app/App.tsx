import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Home } from '../components/Home';
import { Order } from '../components/Order';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import { useOrders } from '../hooks/useOrders';
import { useOrderUpdate } from '../hooks/useOrderUpdate';
import orderService from '../services/orderService';
import { parseNumericId } from '../utils/calculators';
import type { OrderData, UserProfile } from '../types';
import { UI_MESSAGES } from '../config/constants';

const DEFAULT_USER: UserProfile = { name: 'Пользователь', avatar: '👤' };
const queryClient = new QueryClient();

function AppContent() {
  const { initData, user } = useTelegram();
  const orderIdFromUrl = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('orderId');
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);

  const auth = useAuth(initData, orderIdFromUrl);
  const currentUserId = auth.data?.user?.id ?? null;

  const userProfile: UserProfile = useMemo(
    () => ({
      ...DEFAULT_USER,
      name: user?.first_name || user?.username || DEFAULT_USER.name,
    }),
    [user?.first_name, user?.username],
  );

  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [inviteOrderOpened, setInviteOrderOpened] = useState(false);

  const { orders, isLoading, isError, error, loadOrder, refreshOrder, createOrder, deleteOrder } =
    useOrders(userProfile, currentUserId);

  const { updateOrder } = useOrderUpdate(refreshOrder);

  // Load invited order if present in URL
  useMemo(() => {
    if (orderIdFromUrl && !inviteOrderOpened && orders.length > 0) {
      loadOrder(orderIdFromUrl.toString()).then((invitedOrder) => {
        setCurrentOrder(invitedOrder);
        setInviteOrderOpened(true);
      });
    }
  }, [orderIdFromUrl, orders.length, inviteOrderOpened, loadOrder]);

  // Handlers
  const handleCreateOrder = async (order: OrderData) => {
    await createOrder(order);
  };

  const handleUpdateOrder = async (updatedOrder: OrderData) => {
    if (!currentOrder) return;
    await updateOrder(currentOrder, updatedOrder);
    await refreshOrder(updatedOrder.id);
  };

  const handleOpenOrder = async (orderId: string) => {
    const order = await loadOrder(orderId);
    setCurrentOrder(order);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    if (currentOrder?.id === orderId) {
      setCurrentOrder(null);
    }
  };

  const handleCreateInviteLink = async (orderId: string): Promise<string> => {
    const response = await orderService.createInviteLink(parseNumericId(orderId));
    if (!response.url) {
      throw new Error(UI_MESSAGES.ERROR_BACKEND_NO_URL);
    }
    return response.url;
  };

  // Render states
  if (auth.isPending) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-gray-600">
        {UI_MESSAGES.LOADING}
      </div>
    );
  }

  if (auth.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-red-600">
        {UI_MESSAGES.AUTH_ERROR} {auth.error?.message}
      </div>
    );
  }

  if (isLoading && !currentOrder) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-gray-600">
        {UI_MESSAGES.LOADING_ORDERS}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-red-600">
        {error instanceof Error ? error.message : UI_MESSAGES.ORDERS_ERROR}
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
        <Order
          order={currentOrder}
          onUpdateOrder={handleUpdateOrder}
          onBack={() => setCurrentOrder(null)}
          onCreateInviteLink={handleCreateInviteLink}
        />
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
