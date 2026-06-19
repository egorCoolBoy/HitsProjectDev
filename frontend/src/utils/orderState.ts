import type { OrderData } from '../types';

/** Preserve client-only fields (payments, settlements) after a server refresh */
export function mergeClientOrderState(serverOrder: OrderData, clientOrder: OrderData): OrderData {
  return {
    ...serverOrder,
    payments: clientOrder.payments,
    settlements: clientOrder.settlements,
  };
}

/** True when only payments/settlements changed — no API sync needed */
export function isClientOnlyOrderUpdate(current: OrderData, updated: OrderData): boolean {
  return (
    current.name === updated.name &&
    current.isClosed === updated.isClosed &&
    JSON.stringify(current.items) === JSON.stringify(updated.items)
  );
}
