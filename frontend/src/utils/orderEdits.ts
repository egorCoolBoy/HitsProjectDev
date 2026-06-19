import type { OrderItem, Participant } from '../types';

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
  participants: Participant[],
): OrderItem[] {
  if (participants.length === 0) return items;

  const portionPerPerson = 1 / participants.length;

  return items.map((item) => {
    if (item.id !== itemId) return item;

    return {
      ...item,
      participants: participants.map((p) => ({
        participantId: p.id,
        portion: portionPerPerson,
      })),
    };
  });
}
