import type { MouseEvent } from 'react';
import { Plus, Trash2, ChevronRight, Calendar, Users, TrendingUp, TrendingDown } from 'lucide-react';
import type { OrderData, UserProfile } from '../app/App';

type DebtSummary = {
  orderId: string;
  orderName: string;
  creditorId: string;
  creditorName: string;
  creditorColor: string;
  debtorId: string;
  debtorName: string;
  debtorColor: string;
  amount: number;
  settled: boolean;
};

type HomeProps = {
  userProfile: UserProfile;
  orders: OrderData[];
  onCreateOrder: (order: OrderData) => void;
  onOpenOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9', '#A29BFE', '#FD79A8'];

export function Home({ userProfile, orders, onCreateOrder, onOpenOrder, onDeleteOrder }: HomeProps) {
  const calculateAllDebts = (): DebtSummary[] => {
    const allDebts: DebtSummary[] = [];

    orders
      .filter((order) => order.isClosed)
      .forEach((order) => {
        const totals = new Map<string, { shouldPay: number; paid: number }>();

        order.participants.forEach((participant) => {
          const payment = order.payments.find((p) => p.participantId === participant.id);
          totals.set(participant.id, {
            shouldPay: 0,
            paid: payment?.amount || 0,
          });
        });

        order.items.forEach((item) => {
          if (item.participants.length === 0) return;
          const totalPortions = item.participants.reduce((sum, p) => sum + p.portion, 0);
          if (Math.abs(totalPortions - 1) > 0.01) return;

          item.participants.forEach((participantData) => {
            const total = totals.get(participantData.participantId);
            if (total) {
              total.shouldPay += item.price * participantData.portion;
            }
          });
        });

        const balances = new Map<string, number>();
        totals.forEach((total, id) => {
          balances.set(id, total.paid - total.shouldPay);
        });

        const creditors = Array.from(balances.entries())
          .filter(([, balance]) => balance > 0.01)
          .sort((a, b) => b[1] - a[1]);

        const debtors = Array.from(balances.entries())
          .filter(([, balance]) => balance < -0.01)
          .sort((a, b) => a[1] - b[1]);

        const creditorBalances = new Map(creditors.map(([id, balance]) => [id, balance]));
        const debtorBalances = new Map(debtors.map(([id, balance]) => [id, -balance]));

        for (const [debtorId] of debtors) {
          let debtRemaining = debtorBalances.get(debtorId) || 0;

          for (const [creditorId] of creditors) {
            if (debtRemaining < 0.01) break;

            let creditRemaining = creditorBalances.get(creditorId) || 0;
            if (creditRemaining < 0.01) continue;

            const amount = Math.min(debtRemaining, creditRemaining);
            const settlement = order.settlements.find((s) => s.debtorId === `${debtorId}-${creditorId}`);

            const debtor = order.participants.find((p) => p.id === debtorId);
            const creditor = order.participants.find((p) => p.id === creditorId);

            if (debtor && creditor) {
              allDebts.push({
                orderId: order.id,
                orderName: order.name,
                creditorId,
                creditorName: creditor.name,
                creditorColor: creditor.color,
                debtorId,
                debtorName: debtor.name,
                debtorColor: debtor.color,
                amount,
                settled: settlement?.settled || false,
              });
            }

            debtRemaining -= amount;
            creditRemaining -= amount;

            creditorBalances.set(creditorId, creditRemaining);
            debtorBalances.set(debtorId, debtRemaining);
          }
        }
      });

    return allDebts;
  };

  const allDebts = calculateAllDebts();
  const myDebts = allDebts.filter(
    (debt) => debt.debtorName === userProfile.name && !debt.settled
  );
  const myCredits = allDebts.filter(
    (debt) => debt.creditorName === userProfile.name && !debt.settled
  );

  const handleCreateOrder = () => {
    const orderName = prompt('Введите название заказа:') || 'Новый заказ';

    const newOrder: OrderData = {
      id: Date.now().toString(),
      name: orderName,
      participants: [
        {
          id: '1',
          name: userProfile.name,
          color: COLORS[0],
        },
      ],
      items: [],
      createdAt: Date.now(),
      payments: [],
      isClosed: false,
      settlements: [],
    };

    onCreateOrder(newOrder);
  };

  const handleDeleteOrder = (e: MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (confirm('Удалить этот заказ?')) {
      onDeleteOrder(orderId);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <div className="bg-gradient-to-br from-[#0088cc] to-[#0066aa] text-white p-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SplitBot</h1>
            <p className="text-sm text-white/80">Делим счёт без споров</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <span className="text-sm font-medium">{userProfile.name}</span>
              <div className="size-9 rounded-full bg-white/20 flex items-center justify-center text-xl">
                {userProfile.avatar}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-md mx-auto p-4 space-y-4">
          {myDebts.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-red-700 px-2 flex items-center gap-2">
                <TrendingDown className="size-5" />
                Я должен
              </h2>
              {myDebts.map((debt, index) => (
                <div
                  key={index}
                  onClick={() => onOpenOrder(debt.orderId)}
                  className="bg-white rounded-xl shadow-sm border border-red-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: debt.creditorColor }}
                      >
                        {debt.creditorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{debt.creditorName}</p>
                        <p className="text-xs text-gray-500">{debt.orderName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">{debt.amount.toFixed(2)} ₽</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myCredits.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-green-700 px-2 flex items-center gap-2">
                <TrendingUp className="size-5" />
                Мне должны
              </h2>
              {myCredits.map((credit, index) => (
                <div
                  key={index}
                  onClick={() => onOpenOrder(credit.orderId)}
                  className="bg-white rounded-xl shadow-sm border border-green-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: credit.debtorColor }}
                      >
                        {credit.debtorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{credit.debtorName}</p>
                        <p className="text-xs text-gray-500">{credit.orderName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{credit.amount.toFixed(2)} ₽</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {orders.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-700 px-2">Мои заказы</h2>
              {orders.map((order) => {
                const totalAmount = order.items.reduce((sum, item) => sum + item.price, 0);
                return (
                  <div
                    key={order.id}
                    onClick={() => onOpenOrder(order.id)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{order.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {order.participants.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDeleteOrder(e, order.id)}
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
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="size-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-1">У вас пока нет заказов</p>
              <p className="text-sm text-gray-500">Создайте первый заказ, нажав на кнопку выше</p>
            </div>
          )}
        </div>
      </div>

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
