import { DollarSign, Users, CreditCard, Lock } from 'lucide-react';
import type { OrderData } from '../app/App';

type SummaryProps = {
  order: OrderData;
  onUpdateOrder: (order: OrderData) => void;
};

type ParticipantTotal = {
  id: string;
  name: string;
  color: string;
  shouldPay: number;
  paid: number;
  balance: number;
  items: { name: string; share: number }[];
};

type DebtRelation = {
  fromId: string;
  fromName: string;
  fromColor: string;
  toId: string;
  toName: string;
  toColor: string;
  amount: number;
  settled: boolean;
};

export function Summary({ order, onUpdateOrder }: SummaryProps) {
  const calculateTotals = (): ParticipantTotal[] => {
    const totals = new Map<string, ParticipantTotal>();

    order.participants.forEach((participant) => {
      const payment = order.payments.find((p) => p.participantId === participant.id);
      totals.set(participant.id, {
        id: participant.id,
        name: participant.name,
        color: participant.color,
        shouldPay: 0,
        paid: payment?.amount || 0,
        balance: 0,
        items: [],
      });
    });

    order.items.forEach((item) => {
      if (item.participants.length === 0) return;

      const totalPortions = item.participants.reduce((sum, p) => sum + p.portion, 0);
      if (Math.abs(totalPortions - 1) > 0.01) return;

      item.participants.forEach((participantData) => {
        const participantTotal = totals.get(participantData.participantId);
        if (participantTotal) {
          const share = item.price * participantData.portion;
          participantTotal.shouldPay += share;
          participantTotal.items.push({
            name: `${item.name} (${participantData.portion.toFixed(2)})`,
            share,
          });
        }
      });
    });

    totals.forEach((total) => {
      total.balance = total.paid - total.shouldPay;
    });

    return Array.from(totals.values());
  };

  const calculateDebts = (): DebtRelation[] => {
    const totals = calculateTotals();
    const debts: DebtRelation[] = [];

    const creditors = totals.filter((t) => t.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = totals.filter((t) => t.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const creditorBalances = new Map(creditors.map((c) => [c.id, c.balance]));
    const debtorBalances = new Map(debtors.map((d) => [d.id, -d.balance]));

    for (const debtor of debtors) {
      let debtRemaining = debtorBalances.get(debtor.id) || 0;

      for (const creditor of creditors) {
        if (debtRemaining < 0.01) break;

        let creditRemaining = creditorBalances.get(creditor.id) || 0;
        if (creditRemaining < 0.01) continue;

        const amount = Math.min(debtRemaining, creditRemaining);

        const settlement = order.settlements.find(
          (s) => s.debtorId === `${debtor.id}-${creditor.id}`
        );

        debts.push({
          fromId: debtor.id,
          fromName: debtor.name,
          fromColor: debtor.color,
          toId: creditor.id,
          toName: creditor.name,
          toColor: creditor.color,
          amount,
          settled: settlement?.settled || false,
        });

        debtRemaining -= amount;
        creditRemaining -= amount;

        creditorBalances.set(creditor.id, creditRemaining);
        debtorBalances.set(debtor.id, debtRemaining);
      }
    }

    return debts;
  };

  const handlePaymentChange = (participantId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const existingPayments = order.payments.filter((p) => p.participantId !== participantId);
    onUpdateOrder({
      ...order,
      payments: [...existingPayments, { participantId, amount }],
    });
  };

  const handleCloseOrder = () => {
    if (confirm('Закрыть счёт? После этого нельзя будет изменять заказ.')) {
      onUpdateOrder({ ...order, isClosed: true });
    }
  };

  const handleSettleDebt = (debtorId: string, creditorId: string) => {
    const settlementId = `${debtorId}-${creditorId}`;
    const existingSettlements = order.settlements.filter((s) => s.debtorId !== settlementId);
    onUpdateOrder({
      ...order,
      settlements: [...existingSettlements, { debtorId: settlementId, settled: true }],
    });
  };

  const totals = calculateTotals();
  const debts = calculateDebts();
  const grandTotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);

  if (order.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="mb-2">Нет позиций для расчёта</p>
        <p className="text-sm">Добавьте позиции на вкладке &quot;Позиции&quot;</p>
      </div>
    );
  }

  const hasInvalidPortions = order.items.some((item) => {
    const totalPortions = item.participants.reduce((sum, p) => sum + p.portion, 0);
    return item.participants.length > 0 && Math.abs(totalPortions - 1) > 0.01;
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-br from-[#0088cc] to-[#0066aa] text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="size-5" />
          <h2 className="font-semibold">Общая сумма</h2>
        </div>
        <p className="text-4xl font-bold">{grandTotal.toFixed(2)} ₽</p>
        <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/80">Оплачено:</span>
            <span className="font-semibold">{totalPaid.toFixed(2)} ₽</span>
          </div>
          {Math.abs(totalPaid - grandTotal) > 0.01 && (
            <div className="flex items-center justify-between">
              <span className="text-white/80">Осталось:</span>
              <span className="font-semibold">{(grandTotal - totalPaid).toFixed(2)} ₽</span>
            </div>
          )}
        </div>
      </div>

      {hasInvalidPortions && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800">
            ⚠️ У некоторых позиций сумма частей не равна 1. Исправьте на вкладке &quot;Позиции&quot;.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="size-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Кто сколько должен</h2>
        </div>

        {totals.map((participant) => (
          <div
            key={participant.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">{participant.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#0088cc]">{participant.shouldPay.toFixed(2)} ₽</p>
                </div>
              </div>

              {participant.items.length > 0 && (
                <div className="pt-3 border-t border-gray-100 mb-3">
                  <p className="text-xs text-gray-500 mb-2">Позиции:</p>
                  <div className="space-y-1">
                    {participant.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.name}</span>
                        <span className="text-gray-800 font-medium">{item.share.toFixed(2)} ₽</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Заплатил по факту:
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={participant.paid}
                    onChange={(e) => handlePaymentChange(participant.id, e.target.value)}
                    disabled={order.isClosed}
                    className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent disabled:bg-gray-100"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${participant.balance > 0.01 ? 'text-green-600' : participant.balance < -0.01 ? 'text-red-600' : 'text-gray-600'}`}>
                    {participant.balance > 0.01 ? 'Переплатил:' : participant.balance < -0.01 ? 'Недоплатил:' : 'Расчёт сошёлся'}
                  </span>
                  {Math.abs(participant.balance) > 0.01 && (
                    <span className={`text-lg font-bold ${participant.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(participant.balance).toFixed(2)} ₽
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!order.isClosed && totals.some((t) => Math.abs(t.balance) > 0.01) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleCloseOrder}
              className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 font-semibold flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors"
            >
              <Lock className="size-5" />
              Закрыть счёт
            </button>
          </div>
        </div>
      )}

      {order.isClosed && debts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Кто кому должен</h2>
          {debts.map((debt, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                debt.settled ? 'border-green-200 bg-green-50' : 'border-gray-100'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: debt.fromColor }}
                    >
                      {debt.fromName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{debt.fromName}</span>
                    <span className="text-gray-400">→</span>
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: debt.toColor }}
                    >
                      {debt.toName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{debt.toName}</span>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-lg font-bold text-[#0088cc]">{debt.amount.toFixed(2)} ₽</p>
                  </div>
                </div>
                {!debt.settled && (
                  <button
                    onClick={() => handleSettleDebt(debt.fromId, debt.toId)}
                    className="w-full mt-3 bg-green-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-600 transition-colors"
                  >
                    Погасить долг
                  </button>
                )}
                {debt.settled && (
                  <div className="mt-3 text-center text-sm font-medium text-green-600">
                    ✓ Долг погашен
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
