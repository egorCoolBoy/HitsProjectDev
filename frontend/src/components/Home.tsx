import { Plus, Trash2, ChevronRight, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateDebts, formatRelativeDate } from '../utils/calculators';
import { UI_MESSAGES, DEFAULT_VALUES } from '../config/constants';
import type { OrderData, UserProfile } from '../types';

type HomeProps = {
  userProfile: UserProfile;
  orders: OrderData[];
  onCreateOrder: (order: OrderData) => void;
  onOpenOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
};

/**
 * Calculate all debts across closed orders
 */
function calculateAllDebts(orders: OrderData[], userProfile: UserProfile) {
  const allDebts = [];

  for (const order of orders.filter((o) => o.isClosed)) {
    const debts = calculateDebts(order);
    allDebts.push(...debts.map((debt) => ({ ...debt, orderId: order.id, orderName: order.name })));
  }

  const myDebts = allDebts.filter((debt) => debt.fromName === userProfile.name && !debt.settled);
  const myCredits = allDebts.filter((debt) => debt.toName === userProfile.name && !debt.settled);

  return { myDebts, myCredits };
}

export function Home({ userProfile, orders, onCreateOrder, onOpenOrder, onDeleteOrder }: HomeProps) {
  const { myDebts, myCredits } = calculateAllDebts(orders, userProfile);

  const handleCreateOrder = () => {
    const orderName = prompt('Введите название заказа:') || DEFAULT_VALUES.ORDER_NAME;
    const newOrder: OrderData = {
      id: Date.now().toString(),
      name: orderName,
      participants: [{ id: '1', name: userProfile.name, color: '#FF6B6B' }],
      items: [],
      createdAt: Date.now(),
      payments: [],
      isClosed: false,
      settlements: [],
    };
    onCreateOrder(newOrder);
  };

  const handleDeleteOrder = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (confirm(UI_MESSAGES.CONFIRM_DELETE_ORDER)) {
      onDeleteOrder(orderId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0088cc] to-[#0066aa] text-white p-4 shadow-md">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* My Debts */}
          {myDebts.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-red-700 px-2 flex items-center gap-2">
                <TrendingDown className="size-5" />
                Я должен
              </h2>
              {myDebts.map((debt, index) => (
                <DebtCard
                  key={index}
                  debt={debt}
                  isDebt
                  onClick={() => onOpenOrder(debt.orderId)}
                />
              ))}
            </div>
          )}

          {/* My Credits */}
          {myCredits.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-green-700 px-2 flex items-center gap-2">
                <TrendingUp className="size-5" />
                Мне должны
              </h2>
              {myCredits.map((credit, index) => (
                <DebtCard
                  key={index}
                  debt={credit}
                  isDebt={false}
                  onClick={() => onOpenOrder(credit.orderId)}
                />
              ))}
            </div>
          )}

          {/* Orders List */}
          {orders.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-700 px-2">Мои заказы</h2>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onOpen={() => onOpenOrder(order.id)}
                  onDelete={(e) => handleDeleteOrder(e, order.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* FAB Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleCreateOrder}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-semibold hover:bg-[#0077bb] transition-colors"
          >
            <Plus className="size-5" />
            <span>Создать новый заказ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DebtCardProps {
  debt: any;
  isDebt: boolean;
  onClick: () => void;
}

function DebtCard({ debt, isDebt, onClick }: DebtCardProps) {
  const borderColor = isDebt ? 'border-red-100' : 'border-green-100';
  const amountColor = isDebt ? 'text-red-600' : 'text-green-600';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border ${borderColor} p-4 hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: isDebt ? debt.creditorColor : debt.debtorColor }}
          >
            {(isDebt ? debt.creditorName : debt.debtorName).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-800">{isDebt ? debt.creditorName : debt.debtorName}</p>
            <p className="text-xs text-gray-500">{debt.orderName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${amountColor}`}>{debt.amount.toFixed(2)} ₽</p>
        </div>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: OrderData;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function OrderCard({ order, onOpen, onDelete }: OrderCardProps) {
  const totalAmount = order.items.reduce((sum, item) => sum + item.price, 0);

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
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
          <ChevronRight className="size-5 text-gray-400" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-600">{order.items.length} позиций</span>
        <span className="text-lg font-bold text-[#0088cc]">{totalAmount.toFixed(2)} ₽</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Plus className="size-8 text-gray-400" />
      </div>
      <p className="text-gray-600 mb-1">У вас пока нет заказов</p>
      <p className="text-sm text-gray-500">Создайте первый заказ, нажав на кнопку выше</p>
    </div>
  );
}
