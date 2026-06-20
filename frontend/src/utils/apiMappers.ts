import { PARTICIPANT_COLORS } from '../config/constants';
import type {
  ApiOrder,
  ApiOrderExpense,
  ApiOrderParticipant,
  ApiPayment,
  OrderData,
  OrderItem,
  Payment,
  Participant,
} from '../types';

export function parseNumericId(id: string): number {
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getParticipantColor(id: string): string {
  const numericId = parseNumericId(id);
  const index = Math.abs(numericId) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

export function getParticipantName(participant: ApiOrderParticipant): string {
  return (
    participant.user.firstName ||
    participant.user.username ||
    `Пользователь ${participant.user.id}`
  );
}

export function mapOrderToData(
  order: ApiOrder,
  currentUserId: number | null,
  expenses: ApiOrderExpense[] = [],
  payments: ApiPayment[] = [],
): OrderData {
  const participants = mapParticipants(order, currentUserId);
  const items = expenses.map((expense) => mapExpenseToItem(expense, currentUserId));

  return {
    id: order.id.toString(),
    name: order.title || 'Новый заказ',
    participants,
    items,
    createdAt: new Date(order.createdAt).getTime(),
    payments: payments.map(mapPaymentToData),
    isClosed: order.isClosed,
    settlements: [],
  };
}

export function mapPaymentToData(payment: ApiPayment): Payment {
  return {
    participantId: payment.userId.toString(),
    amount: payment.amount,
  };
}

function mapParticipants(order: ApiOrder, currentUserId: number | null): Participant[] {
  if (!order.participants?.length) {
    const id = currentUserId?.toString() ?? 'me';
    return [{ id, name: 'Пользователь', color: getParticipantColor(id) }];
  }

  return order.participants.map((participant) => ({
    id: participant.user.id.toString(),
    name: getParticipantName(participant),
    color: getParticipantColor(participant.user.id.toString()),
  }));
}

function mapExpenseToItem(expense: ApiOrderExpense, _currentUserId: number | null): OrderItem {
  return {
    id: expense.id.toString(),
    name: expense.title || 'Позиция',
    unitPrice: expense.price,
    quantity: expense.quantity,
    participants: (expense.participants ?? []).map((participant) => ({
      participantId: participant.userId.toString(),
      portion: participant.share,
    })),
  };
}
