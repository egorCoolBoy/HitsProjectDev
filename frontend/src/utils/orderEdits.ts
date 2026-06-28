import type { OrderItem } from '../types';

/** Immutable update of a participant's portion on an order item */
export function updateParticipantPortion(
  items: OrderItem[],
  itemId: string,
  participantId: string,
  portion: number,
): OrderItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    if (portion === 0) {
      return {
        ...item,
        participants: item.participants.filter((p) => p.participantId !== participantId),
      };
    }

    const existingIndex = item.participants.findIndex((p) => p.participantId === participantId);

    if (existingIndex >= 0) {
      const newParticipants = [...item.participants];
      newParticipants[existingIndex] = { participantId, portion };
      return { ...item, participants: newParticipants };
    }

    return {
      ...item,
      participants: [...item.participants, { participantId, portion }],
    };
  });
}

/** Split an item evenly across all participants */
export function splitItemEvenly(
  items: OrderItem[],
  itemId: string,
): OrderItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    if (item.participants.length === 0) return item;

    const portionPerPerson = 1 / item.participants.length;

    return {
      ...item,
      participants: item.participants.map((participant) => ({
        participantId: participant.participantId,
        portion: portionPerPerson,
      })),
    };
  });
}

/** Add/remove a participant and keep selected participants split evenly. */
export function toggleParticipantParticipation(
  items: OrderItem[],
  itemId: string,
  participantId: string,
  isParticipating: boolean,
): OrderItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    const selectedIds = item.participants.map((participant) => participant.participantId);
    const nextIds = isParticipating
      ? Array.from(new Set([...selectedIds, participantId]))
      : selectedIds.filter((id) => id !== participantId);

    if (nextIds.length === 0) {
      return { ...item, participants: [] };
    }

    const portion = 1 / nextIds.length;
    return {
      ...item,
      participants: nextIds.map((id) => ({ participantId: id, portion })),
    };
  });
}
