import { VALIDATION } from '../config/constants';

export function isValidPrice(price: number): boolean {
  return !Number.isNaN(price) && price > VALIDATION.PRICE_MIN;
}

export function isValidPortion(portion: string | number): boolean {
  const num = typeof portion === 'string' ? parseFloat(portion) : portion;
  return !Number.isNaN(num) && num >= VALIDATION.PORTION_MIN && num <= VALIDATION.PORTION_MAX;
}

export function isValidQuantity(quantity: number): boolean {
  return !Number.isNaN(quantity) && quantity > 0;
}
