import type { OrderData, OrderItem, Participant } from '../types';
import { PARTICIPANT_COLORS, VALIDATION } from '../config/constants';
import { getParticipantColor } from './calculators';

/**
 * Create a new order item
 */
export function createOrderItem(name: string, price: number): OrderItem {
  return {
    id: Date.now().toString(),
    name,
    price,
    participants: [],
  };
}

/**
 * Create a new participant
 */
export function createParticipant(name: string, existingCount: number): Participant {
  return {
    id: Date.now().toString(),
    name,
    color: PARTICIPANT_COLORS[existingCount % PARTICIPANT_COLORS.length],
  };
}

/**
 * Update participant portion for an item
 */
export function updateParticipantPortion(
  items: OrderItem[],
  itemId: string,
  participantId: string,
  portion: number,
): OrderItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    // If portion is 0, remove participant
    if (portion === 0) {
      return {
        ...item,
        participants: item.participants.filter((p) => p.participantId !== participantId),
      };
    }

    // Check if participant already exists
    const existingIndex = item.participants.findIndex((p) => p.participantId === participantId);

    if (existingIndex >= 0) {
      // Update existing
      const newParticipants = [...item.participants];
      newParticipants[existingIndex] = { participantId, portion };
      return { ...item, participants: newParticipants };
    }

    // Add new
    return {
      ...item,
      participants: [...item.participants, { participantId, portion }],
    };
  });
}

/**
 * Split item evenly among all participants
 */
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

/**
 * Delete item from order
 */
export function deleteItem(items: OrderItem[], itemId: string): OrderItem[] {
  return items.filter((item) => item.id !== itemId);
}

/**
 * Delete participant and remove from all items
 */
export function deleteParticipant(
  participants: Participant[],
  items: OrderItem[],
  participantId: string,
): { participants: Participant[]; items: OrderItem[] } {
  return {
    participants: participants.filter((p) => p.id !== participantId),
    items: items.map((item) => ({
      ...item,
      participants: item.participants.filter((p) => p.participantId !== participantId),
    })),
  };
}

/**
 * Create new order with current user
 */
export function createNewOrder(name: string, userProfile: any): OrderData {
  const currentParticipant: Participant = {
    id: '1',
    name: userProfile.name,
    color: getParticipantColor('1'),
  };

  return {
    id: Date.now().toString(),
    name,
    participants: [currentParticipant],
    items: [],
    createdAt: Date.now(),
    payments: [],
    isClosed: false,
    settlements: [],
  };
}

/**
 * Calculate total price of all items
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * Check if order can be modified (not closed)
 */
export function isOrderModifiable(isClosed: boolean): boolean {
  return !isClosed;
}

/**
 * Validate item price
 */
export function isValidPrice(price: number): boolean {
  return !Number.isNaN(price) && price > VALIDATION.PRICE_MIN;
}

/**
 * Validate portion value
 */
export function isValidPortion(portion: string | number): boolean {
  const num = typeof portion === 'string' ? parseFloat(portion) : portion;
  return !Number.isNaN(num) && num >= VALIDATION.PORTION_MIN && num <= VALIDATION.PORTION_MAX;
}
