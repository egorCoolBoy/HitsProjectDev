import { DEFAULT_VALUES, UI_MESSAGES } from '../config/constants';
import { isValidPrice, isValidQuantity } from './validation';
import type { FormField } from '../components/ui/FormDialog';
import type { OrderItem } from '../types';

export type ExpenseFormData = {
  title: string;
  price: number;
  quantity: number;
};

export function expenseFormFields(item?: OrderItem): FormField[] {
  return [
    {
      name: 'title',
      label: 'Название',
      placeholder: DEFAULT_VALUES.ITEM_NAME,
      required: true,
      defaultValue: item?.name ?? '',
    },
    {
      name: 'price',
      label: 'Цена за единицу (₽)',
      type: 'number',
      min: 0,
      step: DEFAULT_VALUES.PRICE_STEP,
      required: true,
      defaultValue: item ? String(item.unitPrice) : '',
    },
    {
      name: 'quantity',
      label: 'Количество',
      type: 'number',
      min: 1,
      step: DEFAULT_VALUES.QUANTITY_STEP,
      required: true,
      defaultValue: item ? String(item.quantity) : DEFAULT_VALUES.QUANTITY_DEFAULT,
    },
  ];
}

export function parseExpenseForm(
  values: Record<string, string>,
): { data: ExpenseFormData } | { error: string } {
  const title = values.title?.trim();
  const price = parseFloat(values.price);
  const quantity = parseInt(values.quantity, 10);

  if (!title) {
    return { error: 'Введите название позиции' };
  }
  if (!isValidPrice(price)) {
    return { error: UI_MESSAGES.ALERT_INVALID_PRICE };
  }
  if (!isValidQuantity(quantity)) {
    return { error: UI_MESSAGES.ALERT_INVALID_QUANTITY };
  }

  return { data: { title, price, quantity } };
}
