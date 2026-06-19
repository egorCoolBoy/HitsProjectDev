import { PARTICIPANT_COLORS } from '../config/constants';
import type {
  ApiOrder,
  ApiOrderExpense,
  ApiOrderParticipant,
  OrderData,
  OrderItem,
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
): OrderData {
  const participants = mapParticipants(order, currentUserId);
  const items = expenses.map((expense) => mapExpenseToItem(expense, currentUserId));

  return {
    id: order.id.toString(),
    name: order.title || 'Новый заказ',
    participants,
    items,
    createdAt: new Date(order.createdAt).getTime(),
    payments: [],
    isClosed: order.isClosed,
    settlements: [],
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

function mapExpenseToItem(expense: ApiOrderExpense, currentUserId: number | null): OrderItem {
  const currentParticipantId = currentUserId?.toString() ?? 'me';
  return {
    id: expense.id.toString(),
    name: expense.title || 'Позиция',
    price: expense.totalPrice || expense.price * expense.quantity,
    participants: expense.isParticipating
      ? [{ participantId: currentParticipantId, portion: 1 }]
      : [],
  };
}
