import type { OrderData } from '../types';

/** Preserve client-only fields after a server refresh */
export function mergeClientOrderState(serverOrder: OrderData, clientOrder: OrderData): OrderData {
  return {
    ...serverOrder,
    payments: clientOrder.payments,
    settlements: clientOrder.settlements,
    items: mergeItemPortions(serverOrder.items, clientOrder.items),
  };
}

function mergeItemPortions(
  serverItems: OrderData['items'],
  clientItems: OrderData['items'],
): OrderData['items'] {
  return serverItems.map((serverItem) => {
    const clientItem = clientItems.find((item) => item.id === serverItem.id);
    if (!clientItem?.participants.length) return serverItem;
    return { ...serverItem, participants: clientItem.participants };
  });
}

/** True when only payments/settlements changed — no API sync needed */
export function isClientOnlyOrderUpdate(current: OrderData, updated: OrderData): boolean {
  return (
    current.name === updated.name &&
    current.isClosed === updated.isClosed &&
    JSON.stringify(current.items) === JSON.stringify(updated.items)
  );
}

/** True when only item portions changed (same items, prices, names) — kept locally until API supports shares */
export function isPortionsOnlyUpdate(current: OrderData, updated: OrderData): boolean {
  if (current.name !== updated.name || current.isClosed !== updated.isClosed) return false;
  if (current.items.length !== updated.items.length) return false;
  if (JSON.stringify(current.payments) !== JSON.stringify(updated.payments)) return false;
  if (JSON.stringify(current.settlements) !== JSON.stringify(updated.settlements)) return false;

  return current.items.every((item) => {
    const other = updated.items.find((candidate) => candidate.id === item.id);
    return other && item.name === other.name && item.price === other.price;
  });
}

export function shouldSkipApiSync(current: OrderData, updated: OrderData): boolean {
  return isClientOnlyOrderUpdate(current, updated) || isPortionsOnlyUpdate(current, updated);
}
