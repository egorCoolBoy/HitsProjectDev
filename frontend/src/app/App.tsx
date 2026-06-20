import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Home } from '../components/Home';
import { Order } from '../components/Order';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import { useOrders } from '../hooks/useOrders';
import { useCurrentOrder } from '../hooks/useCurrentOrder';
import { MY_DEBTS_QUERY_KEY, useMyDebts } from '../hooks/useMyDebts';
import { useDebtRealtime } from '../hooks/useDebtRealtime';
import orderService from '../services/orderService';
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
  const [dismissedSettlementDebtId, setDismissedSettlementDebtId] = useState<string | null>(null);
  const [settlementActionDebtId, setSettlementActionDebtId] = useState<string | null>(null);
  const orderIdFromUrl = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('orderId');
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);
  const debtIdFromUrl = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('debtId');
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, []);

  const auth = useAuth(initData, orderIdFromUrl);
  const currentUserId = auth.data?.user?.id ?? null;
  const currentOrderRole =
    auth.data?.order?.role === 'creator' || auth.data?.order?.role === 'member'
      ? auth.data.order.role
      : null;

  const userProfile: UserProfile = useMemo(
    () => ({
      ...DEFAULT_USER,
      name: user?.first_name || user?.username || DEFAULT_USER.name,
    }),
    [user?.first_name, user?.username],
  );

  const { orders, isLoading, isError, error, loadOrder, refreshOrder, createOrder, deleteOrder, patchOrder } =
    useOrders(currentUserId, currentOrderRole);
  const myDebts = useMyDebts(currentUserId, orders);
  const refreshMyDebts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [MY_DEBTS_QUERY_KEY, currentUserId] });
  }, [currentUserId]);
  const settlementDebtId = debtIdFromUrl?.toString() ?? null;
  const confirmDebt =
    settlementDebtId && dismissedSettlementDebtId !== settlementDebtId
      ? myDebts.data?.myCredits.find(
          (debt) => debt.debtId === settlementDebtId && debt.status === 'settlementRequested',
        )
      : undefined;

  const orderScreen = useCurrentOrder({
    orderIdFromUrl,
    ordersLoaded: !isLoading,
    loadOrder,
    refreshOrder,
    patchOrder,
    onDebtsChanged: refreshMyDebts,
  });

  useDebtRealtime({
    enabled: !!currentUserId,
    onDebtsChanged: refreshMyDebts,
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
          backendDebts={myDebts.data}
          onCreateOrder={async (title) => {
            await createOrder(title);
          }}
          onOpenOrder={orderScreen.openOrder}
          onDeleteOrder={async (orderId) => {
            await deleteOrder(orderId);
            orderScreen.clearIfDeleted(orderId);
          }}
          onRequestDebtSettlement={async (debtId) => {
            await orderService.requestDebtSettlement(parseInt(debtId, 10));
            await queryClient.invalidateQueries({ queryKey: [MY_DEBTS_QUERY_KEY, currentUserId] });
          }}
        />
      ) : (
        <Order
          order={orderScreen.currentOrder!}
          currentUserId={currentUserId}
          onUpdateOrder={orderScreen.updateOrder}
          onBack={orderScreen.closeOrderView}
          onCreateInviteLink={orderScreen.createInviteLink}
          onAddExpense={orderScreen.addExpense}
          onUpdateExpense={orderScreen.updateExpense}
          onDeleteExpense={orderScreen.deleteExpense}
          onUpdatePayment={orderScreen.updatePayment}
          onCloseOrder={orderScreen.closeOrder}
        />
      )}

      <ConfirmDialog
        open={confirmDebt !== undefined}
        title="Подтвердить погашение"
        message={
          confirmDebt
            ? `${confirmDebt.debtorName} просит подтвердить погашение долга ${confirmDebt.amount.toFixed(2)} ₽ по заказу "${confirmDebt.orderName}".`
            : ''
        }
        confirmLabel={settlementActionDebtId === confirmDebt?.debtId ? 'Подтверждаем...' : 'Подтвердить'}
        cancelLabel={settlementActionDebtId === confirmDebt?.debtId ? 'Отклоняем...' : 'Позже'}
        onConfirm={() => {
          if (!confirmDebt?.debtId) return;

          setSettlementActionDebtId(confirmDebt.debtId);
          orderService
            .confirmDebtSettlement(parseInt(confirmDebt.debtId, 10))
            .then(() => queryClient.invalidateQueries({ queryKey: [MY_DEBTS_QUERY_KEY, currentUserId] }))
            .finally(() => {
              setSettlementActionDebtId(null);
              setDismissedSettlementDebtId(confirmDebt.debtId ?? null);
            });
        }}
        onCancel={() => {
          if (!confirmDebt?.debtId) {
            setDismissedSettlementDebtId(settlementDebtId);
            return;
          }

          setSettlementActionDebtId(confirmDebt.debtId);
          orderService
            .rejectDebtSettlement(parseInt(confirmDebt.debtId, 10))
            .then(() => queryClient.invalidateQueries({ queryKey: [MY_DEBTS_QUERY_KEY, currentUserId] }))
            .finally(() => {
              setSettlementActionDebtId(null);
              setDismissedSettlementDebtId(confirmDebt.debtId ?? settlementDebtId);
            });
        }}
      />
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
