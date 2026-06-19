import { VALIDATION } from '../config/constants';
import type {
  DebtRelation,
  OrderData,
  OrderItem,
  ParticipantPortion,
  ParticipantTotal,
} from '../types';

export function isPortionValid(total: number): boolean {
  return Math.abs(total - 1) < VALIDATION.PORTION_EPSILON;
}

export function calculateTotalPortions(participants: ParticipantPortion[]): number {
  return participants.reduce((sum, p) => sum + p.portion, 0);
}

export function getItemTotal(item: OrderItem): number {
  return item.unitPrice * item.quantity;
}

export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

export function calculateParticipantTotals(order: OrderData): ParticipantTotal[] {
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

    const totalPortions = calculateTotalPortions(item.participants);
    if (!isPortionValid(totalPortions)) return;

    item.participants.forEach((participantData) => {
      const participantTotal = totals.get(participantData.participantId);
      if (participantTotal) {
        const share = getItemTotal(item) * participantData.portion;
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
}

export function calculateDebts(order: OrderData): DebtRelation[] {
  const totals = calculateParticipantTotals(order);
  const debts: DebtRelation[] = [];

  const creditors = totals
    .filter((t) => t.balance > VALIDATION.PORTION_EPSILON)
    .sort((a, b) => b.balance - a.balance);

  const debtors = totals
    .filter((t) => t.balance < -VALIDATION.PORTION_EPSILON)
    .sort((a, b) => a.balance - b.balance);

  const creditorBalances = new Map(creditors.map((c) => [c.id, c.balance]));
  const debtorBalances = new Map(debtors.map((d) => [d.id, -d.balance]));

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

export function hasInvalidItemPortions(order: OrderData): boolean {
  return order.items.some((item) => {
    const totalPortions = calculateTotalPortions(item.participants);
    return item.participants.length > 0 && !isPortionValid(totalPortions);
  });
}
