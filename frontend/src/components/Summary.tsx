import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { CreditCard, DollarSign, Lock, Users } from 'lucide-react';
import {
  calculateOrderTotal,
  calculateParticipantTotals,
  hasInvalidItemPortions,
} from '../utils/orderCalculations';
import { UI_MESSAGES, VALIDATION } from '../config/constants';
import { FixedBottomBar } from './ui/FixedBottomBar';
import { Modal } from './ui/Modal';
import { MoneyAmount } from './ui/MoneyAmount';
import { ParticipantAvatar } from './ui/ParticipantAvatar';
import type { OrderData, ParticipantTotal } from '../types';

type SummaryProps = {
  order: OrderData;
  currentUserId: number | null;
  canCloseOrder: boolean;
  onUpdateOrder: (order: OrderData) => void;
  onUpdatePayment: (participantId: string, amount: number) => Promise<void>;
  onCloseOrder: () => Promise<void>;
};

export function Summary({
  order,
  currentUserId,
  canCloseOrder,
  onUpdateOrder,
  onUpdatePayment,
  onCloseOrder,
}: SummaryProps) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const paymentSyncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const totals = calculateParticipantTotals(order);
  const grandTotal = calculateOrderTotal(order.items);
  const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const canShowCloseButton = canCloseOrder && !order.isClosed;
  const hasPaymentTotalMismatch =
    Math.abs(totalPaid - grandTotal) > VALIDATION.PORTION_EPSILON;

  const handlePaymentChange = (participantId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const existingPayments = order.payments.filter((payment) => payment.participantId !== participantId);

    onUpdateOrder({
      ...order,
      payments: [...existingPayments, { participantId, amount }],
    });

    if (participantId !== currentUserId?.toString()) return;

    clearTimeout(paymentSyncTimers.current[participantId]);
    paymentSyncTimers.current[participantId] = setTimeout(() => {
      onUpdatePayment(participantId, amount).catch((error) => {
        console.warn('Failed to sync payment', error);
      });
    }, 400);
  };

  useEffect(() => {
    const timers = paymentSyncTimers.current;

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  if (order.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="mb-2">Нет позиций для расчета</p>
        <p className="text-sm">Добавьте позиции на вкладке "Позиции"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <TotalCard grandTotal={grandTotal} totalPaid={totalPaid} />

      {hasInvalidItemPortions(order) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800">
            У некоторых позиций сумма частей не равна 1. Исправьте это на вкладке "Позиции".
          </p>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="size-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Кто сколько должен</h2>
        </div>

        {totals.map((participant) => (
          <ParticipantBalanceCard
            key={participant.id}
            participant={participant}
            isClosed={order.isClosed}
            canEditPayment={participant.id === currentUserId?.toString()}
            onPaymentChange={handlePaymentChange}
          />
        ))}
      </section>

      {canShowCloseButton && (
        <FixedBottomBar>
          <button
            onClick={() => {
              setCloseError(null);
              setCloseDialogOpen(true);
            }}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 font-semibold flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors"
          >
            <Lock className="size-5" />
            Закрыть счет
          </button>
        </FixedBottomBar>
      )}

      <CloseOrderConfirmationDialog
        open={closeDialogOpen}
        isClosing={isClosing}
        error={closeError}
        onConfirm={async () => {
          setCloseError(null);
          if (hasPaymentTotalMismatch) {
            setCloseError(UI_MESSAGES.ERROR_PAYMENT_TOTAL_MISMATCH);
            return;
          }

          setIsClosing(true);
          try {
            await onCloseOrder();
            setCloseDialogOpen(false);
          } catch (error) {
            setCloseError(getCloseOrderErrorMessage(error));
          } finally {
            setIsClosing(false);
          }
        }}
        onCancel={() => {
          if (isClosing) return;
          setCloseError(null);
          setCloseDialogOpen(false);
        }}
      />
    </div>
  );
}

function getCloseOrderErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return UI_MESSAGES.ERROR_PAYMENT_TOTAL_MISMATCH;
}

function CloseOrderConfirmationDialog({
  open,
  isClosing,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  isClosing: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Подтверждение закрытия">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{UI_MESSAGES.CONFIRM_CLOSE_ORDER}</p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isClosing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isClosing}
            className="flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors bg-[#0088cc] hover:bg-[#0077bb] text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isClosing ? 'Закрытие...' : 'Закрыть'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TotalCard({ grandTotal, totalPaid }: { grandTotal: number; totalPaid: number }) {
  return (
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
        {Math.abs(totalPaid - grandTotal) > VALIDATION.PORTION_EPSILON && (
          <div className="flex items-center justify-between">
            <span className="text-white/80">Осталось:</span>
            <span className="font-semibold">{(grandTotal - totalPaid).toFixed(2)} ₽</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPaymentInputValue(paid: number): string {
  return Math.abs(paid) < VALIDATION.PORTION_EPSILON ? '' : String(paid);
}

function ParticipantBalanceCard({
  participant,
  isClosed,
  canEditPayment,
  onPaymentChange,
}: {
  participant: ParticipantTotal;
  isClosed: boolean;
  canEditPayment: boolean;
  onPaymentChange: (participantId: string, value: string) => void;
}) {
  const [paymentInput, setPaymentInput] = useState<string | null>(null);
  const balanceAbs = Math.abs(participant.balance);
  const hasBalance = balanceAbs > VALIDATION.PORTION_EPSILON;
  const displayPaymentValue = paymentInput ?? formatPaymentInputValue(participant.paid);

  useEffect(() => {
    setPaymentInput(null);
  }, [participant.paid]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ParticipantAvatar name={participant.name} color={participant.color} />
            <span className="font-medium text-gray-800">{participant.name}</span>
          </div>
          <MoneyAmount value={participant.shouldPay} className="text-2xl font-bold text-[#0088cc]" />
        </div>

        {participant.items.length > 0 && (
          <div className="pt-3 border-t border-gray-100 mb-3">
            <p className="text-xs text-gray-500 mb-2">Позиции:</p>
            <div className="space-y-1">
              {participant.items.map((item) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name}</span>
                  <MoneyAmount value={item.share} className="text-gray-800 font-medium" />
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
              value={displayPaymentValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setPaymentInput(nextValue);
                onPaymentChange(participant.id, nextValue);
              }}
              onBlur={() => setPaymentInput(null)}
              disabled={isClosed || !canEditPayment}
              className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent disabled:bg-gray-100"
              placeholder="0"
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-medium ${
                participant.balance > VALIDATION.PORTION_EPSILON
                  ? 'text-green-600'
                  : participant.balance < -VALIDATION.PORTION_EPSILON
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {participant.balance > VALIDATION.PORTION_EPSILON
                ? 'Переплатил:'
                : participant.balance < -VALIDATION.PORTION_EPSILON
                  ? 'Недоплатил:'
                  : 'Расчет сошелся'}
            </span>
            {hasBalance && (
              <MoneyAmount
                value={balanceAbs}
                className={`text-lg font-bold ${participant.balance > 0 ? 'text-green-600' : 'text-red-600'}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
