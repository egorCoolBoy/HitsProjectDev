import asyncio
import json
import logging
import os
import time
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.error import TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    level=os.getenv('LOG_LEVEL', 'INFO'),
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('BOT_TOKEN')
TELEGRAM_MINIAPP_URL = os.getenv('TELEGRAM_MINIAPP_URL') or os.getenv('MINIAPP_URL')
BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://backend:8080').rstrip('/')
DEBT_REMINDER_INTERVAL_SECONDS = int(os.getenv('DEBT_REMINDER_INTERVAL_SECONDS', '86400'))
DEBT_REMINDER_INITIAL_DELAY_SECONDS = int(os.getenv('DEBT_REMINDER_INITIAL_DELAY_SECONDS', '0'))
DEBT_REMINDER_POLL_SECONDS = int(os.getenv('DEBT_REMINDER_POLL_SECONDS', '10'))
REMINDER_STATE_FILE = Path(os.getenv('REMINDER_STATE_FILE', '/app/.state/reminders.json'))

if not BOT_TOKEN:
    raise RuntimeError('BOT_TOKEN is not set')

if not TELEGRAM_MINIAPP_URL:
    raise RuntimeError('TELEGRAM_MINIAPP_URL is not set')


def load_reminder_state() -> dict:
    default_state = {
        'last_sent_by_debt_id': {},
        'sent_settlement_request_keys': [],
    }

    if not REMINDER_STATE_FILE.exists():
        return default_state

    try:
        with REMINDER_STATE_FILE.open('r', encoding='utf-8') as file:
            payload = json.load(file)
    except (OSError, json.JSONDecodeError):
        logger.warning('Failed to load reminder state from %s', REMINDER_STATE_FILE)
        return default_state

    if not isinstance(payload, dict):
        return default_state

    last_sent = payload.get('last_sent_by_debt_id')
    settlement_keys = payload.get('sent_settlement_request_keys')

    return {
        'last_sent_by_debt_id': last_sent if isinstance(last_sent, dict) else {},
        'sent_settlement_request_keys': settlement_keys if isinstance(settlement_keys, list) else [],
    }


def save_reminder_state(application: Application) -> None:
    state = {
        'last_sent_by_debt_id': application.bot_data.get('last_sent_by_debt_id', {}),
        'sent_settlement_request_keys': sorted(application.bot_data.get('sent_settlement_request_keys', set())),
    }

    try:
        REMINDER_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with REMINDER_STATE_FILE.open('w', encoding='utf-8') as file:
            json.dump(state, file, ensure_ascii=False, indent=2)
    except OSError:
        logger.warning('Failed to save reminder state to %s', REMINDER_STATE_FILE)


def build_miniapp_url(order_id: str | int | None = None, debt_id: str | int | None = None) -> str:
    """Attach order id for Mini App if deep-link payload contains one."""
    if not order_id and not debt_id:
        return TELEGRAM_MINIAPP_URL

    parsed = urlsplit(TELEGRAM_MINIAPP_URL)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))

    if order_id:
        query['orderId'] = str(order_id)

    if debt_id:
        query['debtId'] = str(debt_id)

    new_query = urlencode(query)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def extract_order_id(start_payload: str | None) -> str | None:
    if not start_payload:
        return None

    prefix = 'order_'
    if not start_payload.startswith(prefix):
        return None

    order_id = start_payload[len(prefix):].strip()
    return order_id or None


def format_amount(value: object) -> str:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return str(value)

    normalized = amount.quantize(Decimal('0.01'))
    return f'{normalized:,.2f}'.replace(',', ' ')


def user_display_name(user: dict) -> str:
    first_name = user.get('firstName')
    username = user.get('username')

    if first_name:
        return str(first_name)

    if username:
        return f'@{username}'

    return f"пользователю #{user.get('userId')}"


def build_debt_message(debts: list[dict]) -> tuple[str, InlineKeyboardMarkup | None]:
    lines = ['Напоминание о долгах в SplitBot', '']

    for debt in debts:
        order = debt.get('order') or {}
        creditor = debt.get('creditor') or {}
        order_title = order.get('title') or f"заказ #{order.get('id')}"
        creditor_name = user_display_name(creditor)
        amount = format_amount(debt.get('amount'))

        lines.append(f'• Заказ: {order_title}')
        lines.append(f'  Кому погасить: {creditor_name}')
        lines.append(f'  Сумма: {amount} ₽')

    lines.append('')
    lines.append('Откройте заказ и отметьте погашение, когда долг будет закрыт.')

    first_order = (debts[0].get('order') or {}) if debts else {}
    order_id = first_order.get('id')
    keyboard = None

    if order_id:
        keyboard = InlineKeyboardMarkup(
            [[InlineKeyboardButton(text='Открыть заказ', web_app=WebAppInfo(url=build_miniapp_url(order_id)))]]
        )

    return '\n'.join(lines), keyboard


async def fetch_active_debts() -> list[dict]:
    debts = await fetch_debts('active')
    return [debt for debt in debts if debt.get('status') in (None, 'active', 'Active', 0)]


async def fetch_settlement_requested_debts() -> list[dict]:
    return await fetch_debts('settlementRequested')


async def fetch_debts(status: str) -> list[dict]:
    url = f'{BACKEND_API_URL}/bot/debts'
    headers = {'X-Bot-Token': BOT_TOKEN}
    params = {'status': status, 'sortDirection': 'desc'}

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        payload = response.json()

    debts = payload.get('debts')
    if not isinstance(debts, list):
        logger.warning('Unexpected /bot/debts response shape: %s', payload)
        return []

    return debts


def group_debts_by_debtor(debts: list[dict]) -> dict[int, list[dict]]:
    grouped: dict[int, list[dict]] = {}

    for debt in debts:
        debtor = debt.get('debtor') or {}
        telegram_id = debtor.get('telegramId')

        if not telegram_id:
            logger.warning('Debt %s has no debtor.telegramId', debt.get('debtId'))
            continue

        grouped.setdefault(int(telegram_id), []).append(debt)

    return grouped


def group_debts_by_creditor(debts: list[dict]) -> dict[int, list[dict]]:
    grouped: dict[int, list[dict]] = {}

    for debt in debts:
        creditor = debt.get('creditor') or {}
        telegram_id = creditor.get('telegramId')

        if not telegram_id:
            logger.warning('Debt %s has no creditor.telegramId', debt.get('debtId'))
            continue

        grouped.setdefault(int(telegram_id), []).append(debt)

    return grouped


def debt_key(debt: dict) -> str:
    debt_id = debt.get('debtId')
    if debt_id is not None:
        return str(debt_id)

    order = debt.get('order') or {}
    debtor = debt.get('debtor') or {}
    creditor = debt.get('creditor') or {}
    return f"{order.get('id')}:{debtor.get('userId')}:{creditor.get('userId')}"


def filter_debts_due_for_reminder(application: Application, debts: list[dict]) -> list[dict]:
    now = time.time()
    last_sent_by_debt_id = application.bot_data.setdefault('last_sent_by_debt_id', {})
    due_debts: list[dict] = []
    active_debt_keys = set()

    for debt in debts:
        key = debt_key(debt)
        active_debt_keys.add(key)
        last_sent_at = last_sent_by_debt_id.get(key)

        if last_sent_at is None or now - last_sent_at >= DEBT_REMINDER_INTERVAL_SECONDS:
            due_debts.append(debt)

    for key in list(last_sent_by_debt_id):
        if key not in active_debt_keys:
            del last_sent_by_debt_id[key]
            save_reminder_state(application)

    return due_debts


def mark_debts_as_sent(application: Application, debts: list[dict]) -> None:
    now = time.time()
    last_sent_by_debt_id = application.bot_data.setdefault('last_sent_by_debt_id', {})

    for debt in debts:
        last_sent_by_debt_id[debt_key(debt)] = now

    save_reminder_state(application)


async def send_debt_reminders(application: Application) -> None:
    debts = await fetch_active_debts()
    due_debts = filter_debts_due_for_reminder(application, debts)
    grouped_debts = group_debts_by_debtor(due_debts)

    if not grouped_debts:
        logger.info('No debts due for reminder.')
        return

    for telegram_id, debtor_debts in grouped_debts.items():
        message, keyboard = build_debt_message(debtor_debts)

        try:
            await application.bot.send_message(
                chat_id=telegram_id,
                text=message,
                reply_markup=keyboard,
                disable_web_page_preview=True,
            )
            mark_debts_as_sent(application, debtor_debts)
            logger.info('Sent debt reminder to telegram_id=%s, debts=%s', telegram_id, len(debtor_debts))
        except TelegramError as exception:
            logger.warning('Failed to send debt reminder to telegram_id=%s: %s', telegram_id, exception)


def build_settlement_request_message(debts: list[dict]) -> tuple[str, InlineKeyboardMarkup | None]:
    lines = ['Запрос на погашение долга в SplitBot', '']

    for debt in debts:
        order = debt.get('order') or {}
        debtor = debt.get('debtor') or {}
        order_title = order.get('title') or f"заказ #{order.get('id')}"
        debtor_name = user_display_name(debtor)
        amount = format_amount(debt.get('amount'))

        lines.append(f'• Заказ: {order_title}')
        lines.append(f'  Должник: {debtor_name}')
        lines.append(f'  Сумма: {amount} ₽')

    lines.append('')
    lines.append('Откройте приложение и подтвердите или отклоните погашение.')

    first_debt = debts[0] if debts else {}
    first_order = first_debt.get('order') or {}
    debt_id = first_debt.get('debtId')
    order_id = first_order.get('id')
    keyboard = None

    if debt_id:
        keyboard = InlineKeyboardMarkup(
            [[InlineKeyboardButton(
                text='Подтвердить погашение',
                web_app=WebAppInfo(url=build_miniapp_url(order_id=order_id, debt_id=debt_id)),
            )]]
        )

    return '\n'.join(lines), keyboard


def filter_new_settlement_requests(application: Application, debts: list[dict]) -> list[dict]:
    sent_keys = application.bot_data.setdefault('sent_settlement_request_keys', set())
    active_keys = {debt_key(debt) for debt in debts}
    new_debts = [debt for debt in debts if debt_key(debt) not in sent_keys]

    for key in list(sent_keys):
        if key not in active_keys:
            sent_keys.remove(key)
            save_reminder_state(application)

    return new_debts


def mark_settlement_requests_as_sent(application: Application, debts: list[dict]) -> None:
    sent_keys = application.bot_data.setdefault('sent_settlement_request_keys', set())

    for debt in debts:
        sent_keys.add(debt_key(debt))

    save_reminder_state(application)


async def send_settlement_request_notifications(application: Application) -> None:
    debts = await fetch_settlement_requested_debts()
    new_debts = filter_new_settlement_requests(application, debts)
    grouped_debts = group_debts_by_creditor(new_debts)

    if not grouped_debts:
        logger.info('No new settlement requests.')
        return

    for telegram_id, creditor_debts in grouped_debts.items():
        for debt in creditor_debts:
            message, keyboard = build_settlement_request_message([debt])

            try:
                await application.bot.send_message(
                    chat_id=telegram_id,
                    text=message,
                    reply_markup=keyboard,
                    disable_web_page_preview=True,
                )
                mark_settlement_requests_as_sent(application, [debt])
                logger.info('Sent settlement request to telegram_id=%s, debt=%s', telegram_id, debt.get('debtId'))
            except TelegramError as exception:
                logger.warning('Failed to send settlement request to telegram_id=%s: %s', telegram_id, exception)


async def debt_reminder_loop(application: Application) -> None:
    await asyncio.sleep(max(0, DEBT_REMINDER_INITIAL_DELAY_SECONDS))

    while True:
        try:
            await send_debt_reminders(application)
            await send_settlement_request_notifications(application)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception('Debt reminder cycle failed.')

        await asyncio.sleep(max(10, DEBT_REMINDER_POLL_SECONDS))


async def post_init(application: Application) -> None:
    reminder_state = load_reminder_state()
    application.bot_data['last_sent_by_debt_id'] = reminder_state.get('last_sent_by_debt_id', {})
    application.bot_data['sent_settlement_request_keys'] = set(
        reminder_state.get('sent_settlement_request_keys', []),
    )

    task = asyncio.create_task(debt_reminder_loop(application))
    application.bot_data['debt_reminder_task'] = task
    logger.info(
        'Debt reminder loop started: backend=%s initial_delay=%ss repeat_interval=%ss poll=%ss',
        BACKEND_API_URL,
        DEBT_REMINDER_INITIAL_DELAY_SECONDS,
        DEBT_REMINDER_INTERVAL_SECONDS,
        DEBT_REMINDER_POLL_SECONDS,
    )


async def post_shutdown(application: Application) -> None:
    task = application.bot_data.get('debt_reminder_task')
    if not task:
        return

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info('Debt reminder loop stopped.')


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    start_payload = context.args[0] if context.args else None
    order_id = extract_order_id(start_payload)

    miniapp_url = build_miniapp_url(order_id)
    keyboard = InlineKeyboardMarkup(
        [[InlineKeyboardButton(text='Open Mini App', web_app=WebAppInfo(url=miniapp_url))]]
    )

    if order_id:
        message = (
            f'You joined from order #{order_id}. '
            'Tap the button below to continue in Mini App.'
        )
    else:
        message = 'Tap the button below to open Mini App:'

    if update.message:
        await update.message.reply_text(message, reply_markup=keyboard)


def main() -> None:
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    app.add_handler(CommandHandler('start', start))
    app.run_polling()


if __name__ == '__main__':
    main()
