import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = '6180990883:AAEU4eItTAPT_6Wga8NHMw953g6oUjFnajs'
TELEGRAM_MINIAPP_URL = 'https://fine-cooks-jump.loca.lt'

if not BOT_TOKEN:
    raise RuntimeError('BOT_TOKEN is not set')

if not TELEGRAM_MINIAPP_URL:
    raise RuntimeError('TELEGRAM_MINIAPP_URL is not set')


def build_miniapp_url(order_id: str | None = None) -> str:
    """Attach order id for Mini App if deep-link payload contains one."""
    if not order_id:
        return TELEGRAM_MINIAPP_URL

    parsed = urlsplit(TELEGRAM_MINIAPP_URL)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query['orderId'] = order_id
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
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.run_polling()


if __name__ == '__main__':
    main()
