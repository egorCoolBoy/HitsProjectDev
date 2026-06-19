import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Home } from '../components/Home';
import { Order } from '../components/Order';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import { useOrders } from '../hooks/useOrders';
import { useCurrentOrder } from '../hooks/useCurrentOrder';
import type { UserProfile } from '../types';
import { UI_MESSAGES } from '../config/constants';

const DEFAULT_USER: UserProfile = { name: 'Пользователь', avatar: '👤' };
const queryClient = new QueryClient();

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-gray-600">
      {message}
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6 text-center text-red-600">
      {message}
    </div>
  );
}

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

  const { orders, isLoading, isError, error, loadOrder, refreshOrder, createOrder, deleteOrder, patchOrder } =
    useOrders(currentUserId);

  const orderScreen = useCurrentOrder({
    orderIdFromUrl,
    ordersLoaded: !isLoading,
    loadOrder,
    refreshOrder,
    patchOrder,
  });

  if (auth.isPending) return <LoadingScreen message={UI_MESSAGES.LOADING} />;

  if (auth.isError) {
    return <ErrorScreen message={`${UI_MESSAGES.AUTH_ERROR} ${auth.error?.message}`} />;
  }

  if (isLoading && orderScreen.isOnHome) {
    return <LoadingScreen message={UI_MESSAGES.LOADING_ORDERS} />;
  }

  if (isError) {
    return (
      <ErrorScreen
        message={error instanceof Error ? error.message : UI_MESSAGES.ORDERS_ERROR}
      />
    );
  }

  return (
    <div className="size-full bg-[#f5f5f5]">
      {orderScreen.isOnHome ? (
        <Home
          userProfile={userProfile}
          currentUserId={currentUserId}
          orders={orders}
          onCreateOrder={async (title) => {
            await createOrder(title);
          }}
          onOpenOrder={orderScreen.openOrder}
          onDeleteOrder={async (orderId) => {
            await deleteOrder(orderId);
            orderScreen.clearIfDeleted(orderId);
          }}
        />
      ) : (
        <Order
          order={orderScreen.currentOrder!}
          onUpdateOrder={orderScreen.updateOrder}
          onBack={orderScreen.closeOrderView}
          onCreateInviteLink={orderScreen.createInviteLink}
          onAddExpense={orderScreen.addExpense}
          onUpdateExpense={orderScreen.updateExpense}
          onDeleteExpense={orderScreen.deleteExpense}
          onCloseOrder={orderScreen.closeOrder}
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
