import { PARTICIPANT_COLORS, VALIDATION } from '../config/constants';
import type { ApiOrderParticipant, OrderData, OrderItem, Participant, ParticipantPortion, ParticipantTotal, DebtRelation, ApiOrder, ApiOrderExpense } from '../types';

/**
 * Convert string ID to number, safely
 */
export function parseNumericId(id: string): number {
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Get color for participant based on their ID
 */
export function getParticipantColor(id: string): string {
  const numericId = parseNumericId(id);
  const index = Math.abs(numericId) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

/**
 * Extract participant display name with fallback
 */
export function getParticipantName(participant: ApiOrderParticipant): string {
  return participant.user.firstName || participant.user.username || `Пользователь ${participant.user.id}`;
}

/**
 * Check if portions sum equals 1 (within tolerance)
 */
export function isPortionValid(total: number): boolean {
  return Math.abs(total - 1) < VALIDATION.PORTION_EPSILON;
}

/**
 * Calculate sum of portions for an item
 */
export function calculateTotalPortions(participants: ParticipantPortion[]): number {
  return participants.reduce((sum, p) => sum + p.portion, 0);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ₽`;
}

/**
 * Format relative date (Today, Yesterday, etc.)
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Map API order to internal OrderData structure
 */
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

/**
 * Map API participants to Participant[]
 */
function mapParticipants(order: ApiOrder, currentUserId: number | null): Participant[] {
  if (!order.participants?.length) {
    // Return current user as only participant if no participants exist
    const id = currentUserId?.toString() ?? 'me';
    return [{
      id,
      name: 'Пользователь',
      color: getParticipantColor(id),
    }];
  }

  return order.participants.map((participant) => ({
    id: participant.user.id.toString(),
    name: getParticipantName(participant),
    color: getParticipantColor(participant.user.id.toString()),
  }));
}

/**
 * Map API expense to OrderItem
 */
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

/**
 * Calculate what each participant should pay
 */
export function calculateParticipantTotals(order: OrderData): ParticipantTotal[] {
  const totals = new Map<string, ParticipantTotal>();

  // Initialize totals for each participant
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

  // Calculate what each participant should pay based on items
  order.items.forEach((item) => {
    if (item.participants.length === 0) return;

    const totalPortions = calculateTotalPortions(item.participants);
    if (!isPortionValid(totalPortions)) return;

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

  // Calculate balance (paid - should pay)
  totals.forEach((total) => {
    total.balance = total.paid - total.shouldPay;
  });

  return Array.from(totals.values());
}

/**
 * Calculate who owes whom
 */
export function calculateDebts(order: OrderData): DebtRelation[] {
  const totals = calculateParticipantTotals(order);
  const debts: DebtRelation[] = [];

  // Separate creditors and debtors
  const creditors = totals
    .filter((t) => t.balance > VALIDATION.PORTION_EPSILON)
    .sort((a, b) => b.balance - a.balance);

  const debtors = totals
    .filter((t) => t.balance < -VALIDATION.PORTION_EPSILON)
    .sort((a, b) => a.balance - b.balance);

  // Create maps to track remaining balances
  const creditorBalances = new Map(creditors.map((c) => [c.id, c.balance]));
  const debtorBalances = new Map(debtors.map((d) => [d.id, -d.balance]));

  // Match debtors with creditors
  for (const debtor of debtors) {
    let debtRemaining = debtorBalances.get(debtor.id) || 0;

    for (const creditor of creditors) {
      if (debtRemaining < VALIDATION.PORTION_EPSILON) break;

      let creditRemaining = creditorBalances.get(creditor.id) || 0;
      if (creditRemaining < VALIDATION.PORTION_EPSILON) continue;

      const amount = Math.min(debtRemaining, creditRemaining);
      const settlement = order.settlements.find(
        (s) => s.debtorId === `${debtor.id}-${creditor.id}`,
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
}
