// Application-wide constants

/** Color palette for participant avatars */
export const PARTICIPANT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DFE6E9', // Gray
  '#A29BFE', // Purple
  '#FD79A8', // Pink
] as const;

/** Primary brand color */
export const PRIMARY_COLOR = '#0088cc';

/** Primary color (darker shade) */
export const PRIMARY_COLOR_DARK = '#0077bb';

/** UI Messages */
export const UI_MESSAGES = {
  CONFIRM_DELETE_ORDER: 'Удалить этот заказ?',
  CONFIRM_DELETE_ITEM: 'Удалить эту позицию?',
  CONFIRM_DELETE_PARTICIPANT: 'Удалить этого участника?',
  CONFIRM_CLOSE_ORDER: 'Закрыть счёт? После этого нельзя будет изменять заказ.',
  ERROR_PAYMENT_TOTAL_MISMATCH:
    'Сумма оплат не совпадает с суммой счёта. Проверьте введённые платежи.',
  CONFIRM_LAST_PARTICIPANT: 'Нельзя удалить последнего участника',
  ALERT_ORDER_CLOSED: 'Счёт закрыт. Изменения невозможны.',
  ALERT_INVALID_PRICE: 'Введите корректную цену',
  ALERT_INVALID_QUANTITY: 'Введите корректное количество (целое число больше 0)',
  ALERT_INVITE_LINK_ERROR: 'Не удалось создать ссылку приглашения',
  ALERT_INVITE_LINK_COPIED: 'Ссылка скопирована в буфер обмена!',
  ERROR_BACKEND_NO_URL: 'Backend не вернул ссылку приглашения',
  ERROR_NO_INIT_DATA: 'No initData',
  LOADING: 'Загрузка...',
  LOADING_ORDERS: 'Загружаем заказы...',
  AUTH_ERROR: 'Ошибка авторизации:',
  ORDERS_ERROR: 'Не удалось загрузить заказы',
} as const;

/** Default placeholder values */
export const DEFAULT_VALUES = {
  ORDER_NAME: 'Новый заказ',
  ITEM_NAME: 'Позиция',
  USER_NAME: 'Пользователь',
  PORTION_STEP: '0.01',
  PRICE_STEP: '0.01',
  QUANTITY_DEFAULT: '1',
  QUANTITY_STEP: '1',
} as const;

/** Input validation rules */
export const VALIDATION = {
  PRICE_MIN: 0,
  PORTION_MIN: 0,
  PORTION_MAX: 1,
  PORTION_EPSILON: 0.01, // tolerance for comparing portions to 1.0
} as const;

/** Share invite text */
export const SHARE_INVITE = {
  TITLE: 'Присоединяйтесь к заказу в SplitBot',
  TEXT: 'Нажмите на ссылку, чтобы присоединиться к совместному заказу',
} as const;
