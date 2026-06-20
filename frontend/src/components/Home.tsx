import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { collectUserDebts } from '../utils/homeDebts';
import { formatRelativeDate } from '../utils/format';
import { calculateOrderTotal } from '../utils/orderCalculations';
import { UI_MESSAGES, DEFAULT_VALUES } from '../config/constants';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { FormDialog } from './ui/FormDialog';
import { FixedBottomBar } from './ui/FixedBottomBar';
import { MoneyAmount } from './ui/MoneyAmount';
import { ParticipantAvatar } from './ui/ParticipantAvatar';
import type { DebtSummary, OrderData, UserProfile } from '../types';

type HomeProps = {
  userProfile: UserProfile;
  currentUserId: number | null;
  orders: OrderData[];
  backendDebts?: {
    myDebts: DebtSummary[];
    myCredits: DebtSummary[];
  };
  onCreateOrder: (title: string) => Promise<void>;
  onOpenOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
};

export function Home({
  userProfile,
  currentUserId,
  orders,
  backendDebts,
  onCreateOrder,
  onOpenOrder,
  onDeleteOrder,
}: HomeProps) {
  const fallbackDebts = collectUserDebts(orders, currentUserId);
  const { myDebts, myCredits } = backendDebts ?? fallbackDebts;
  const [activeMainTab, setActiveMainTab] = useState<'orders' | 'debts'>('orders');
  const [activeOrderTab, setActiveOrderTab] = useState<'open' | 'closed'>('open');
  const [activeDebtTab, setActiveDebtTab] = useState<'debtors' | 'creditors'>('debtors');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const openOrders = orders.filter((order) => !order.isClosed);
  const closedOrders = orders.filter((order) => order.isClosed);
  const visibleOrders = activeOrderTab === 'open' ? openOrders : closedOrders;
  const visibleDebts = activeDebtTab === 'debtors' ? myCredits : myDebts;

  const handleCreateSubmit = async (values: Record<string, string>) => {
    const title = values.title?.trim();
    if (!title) {
      setCreateError('Введите название заказа');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateOrder(title);
      setCreateDialogOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Не удалось создать заказ');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <header className="bg-gradient-to-br from-[#0088cc] to-[#0066aa] text-white p-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SplitBot</h1>
            <p className="text-sm text-white/80">Делим счёт без споров</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <span className="text-sm font-medium">{userProfile.name}</span>
            <div className="size-9 rounded-full bg-white/20 flex items-center justify-center text-xl">
              {userProfile.avatar}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-24">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <SegmentedTabs
            tabs={[
              { id: 'orders', label: 'Заказы' },
              { id: 'debts', label: 'Долги' },
            ]}
            activeTab={activeMainTab}
            onChange={setActiveMainTab}
          />

          {activeMainTab === 'orders' ? (
            <>
              <SegmentedTabs
                tabs={[
                  { id: 'open', label: `Открытые (${openOrders.length})` },
                  { id: 'closed', label: `Закрытые (${closedOrders.length})` },
                ]}
                activeTab={activeOrderTab}
                onChange={setActiveOrderTab}
              />

              {visibleOrders.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="font-semibold text-gray-700 px-2">
                    {activeOrderTab === 'open' ? 'Открытые заказы' : 'Закрытые заказы'}
                  </h2>
                  {visibleOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onOpen={() => onOpenOrder(order.id)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        setDeleteOrderId(order.id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={activeOrderTab === 'open' ? 'Нет открытых заказов' : 'Нет закрытых заказов'}
                  description={
                    activeOrderTab === 'open'
                      ? 'Создайте новый заказ, чтобы начать делить счёт'
                      : 'Здесь появятся счета после закрытия'
                  }
                />
              )}
            </>
          ) : (
            <>
              <SegmentedTabs
                tabs={[
                  { id: 'debtors', label: `Должники (${myCredits.length})` },
                  { id: 'creditors', label: `Кредиторы (${myDebts.length})` },
                ]}
                activeTab={activeDebtTab}
                onChange={setActiveDebtTab}
              />

              {visibleDebts.length > 0 ? (
                <DebtSection
                  title={activeDebtTab === 'debtors' ? 'Кто мне должен' : 'Кому я должен'}
                  icon={
                    activeDebtTab === 'debtors' ? (
                      <TrendingUp className="size-5" />
                    ) : (
                      <TrendingDown className="size-5" />
                    )
                  }
                  titleClassName={activeDebtTab === 'debtors' ? 'text-green-700' : 'text-red-700'}
                  debts={visibleDebts}
                  variant={activeDebtTab === 'debtors' ? 'credit' : 'debt'}
                  onOpenOrder={onOpenOrder}
                />
              ) : (
                <EmptyDebtsState
                  title={activeDebtTab === 'debtors' ? 'Вам пока никто не должен' : 'Вы пока никому не должны'}
                  description={
                    activeDebtTab === 'debtors'
                      ? 'Здесь появятся долги других участников после закрытия счетов'
                      : 'Здесь появятся ваши долги после закрытия счетов'
                  }
                />
              )}
            </>
          )}
        </div>
      </main>

      {activeMainTab === 'orders' && (
        <FixedBottomBar>
          <button
            onClick={() => {
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold hover:bg-[#0077bb] transition-colors"
          >
            <Plus className="size-5" />
            <span>Создать новый заказ</span>
          </button>
        </FixedBottomBar>
      )}

      <FormDialog
        open={createDialogOpen}
        title="Новый заказ"
        fields={[
          {
            name: 'title',
            label: 'Название заказа',
            placeholder: DEFAULT_VALUES.ORDER_NAME,
            required: true,
            defaultValue: '',
          },
        ]}
        submitLabel={isCreating ? 'Создание...' : 'Создать'}
        error={createError}
        onSubmit={handleCreateSubmit}
        onClose={() => !isCreating && setCreateDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteOrderId !== null}
        title="Удалить заказ"
        message={UI_MESSAGES.CONFIRM_DELETE_ORDER}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (deleteOrderId) {
            onDeleteOrder(deleteOrderId);
            setDeleteOrderId(null);
          }
        }}
        onCancel={() => setDeleteOrderId(null)}
      />
    </div>
  );
}

type SegmentedTabsProps<T extends string> = {
  tabs: Array<{ id: T; label: string }>;
  activeTab: T;
  onChange: (tab: T) => void;
};

function SegmentedTabs<T extends string>({ tabs, activeTab, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-[#0088cc] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type DebtSectionProps = {
  title: string;
  icon: React.ReactNode;
  titleClassName: string;
  debts: DebtSummary[];
  variant: 'debt' | 'credit';
  onOpenOrder: (orderId: string) => void;
};

function DebtSection({ title, icon, titleClassName, debts, variant, onOpenOrder }: DebtSectionProps) {
  return (
    <div className="space-y-3">
      <h2 className={`font-semibold px-2 flex items-center gap-2 ${titleClassName}`}>
        {icon}
        {title}
      </h2>
      {debts.map((debt) => (
        <HomeDebtCard
          key={`${debt.orderId}-${debt.debtorId}-${debt.creditorId}`}
          debt={debt}
          variant={variant}
          onClick={() => onOpenOrder(debt.orderId)}
        />
      ))}
    </div>
  );
}

type HomeDebtCardProps = {
  debt: DebtSummary;
  variant: 'debt' | 'credit';
  onClick: () => void;
};

function HomeDebtCard({ debt, variant, onClick }: HomeDebtCardProps) {
  const isDebt = variant === 'debt';
  const counterpartyName = isDebt ? debt.creditorName : debt.debtorName;
  const counterpartyColor = isDebt ? debt.creditorColor : debt.debtorColor;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isDebt ? 'border-red-100' : 'border-green-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <ParticipantAvatar name={counterpartyName} color={counterpartyColor} />
          <div>
            <p className="font-medium text-gray-800">{counterpartyName}</p>
            <p className="text-xs text-gray-500">{debt.orderName}</p>
          </div>
        </div>
        <MoneyAmount
          value={debt.amount}
          className={`text-xl font-bold ${isDebt ? 'text-red-600' : 'text-green-600'}`}
        />
      </div>
    </div>
  );
}

type OrderCardProps = {
  order: OrderData;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

function OrderCard({ order, onOpen, onDelete }: OrderCardProps) {
  const totalAmount = calculateOrderTotal(order.items);

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{order.name}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatRelativeDate(order.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {order.participants.length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {order.isClosed ? "" : 
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            }
          <ChevronRight className="size-5 text-gray-400" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-600">{order.items.length} позиций</span>
        <MoneyAmount value={totalAmount} className="text-lg font-bold text-[#0088cc]" />
      </div>
    </div>
  );
}

function EmptyState({
  title = 'У вас пока нет заказов',
  description = 'Создайте первый заказ, нажав на кнопку выше',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Plus className="size-8 text-gray-400" />
      </div>
      <p className="text-gray-600 mb-1">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function EmptyDebtsState({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <TrendingUp className="size-8 text-gray-400" />
      </div>
      <p className="text-gray-600 mb-1">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
