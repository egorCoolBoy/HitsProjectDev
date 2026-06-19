import { useState } from 'react';
import { ArrowLeft, Plus, Users, Calculator } from 'lucide-react';
import { ItemList } from './ItemList';
import { ParticipantList } from './ParticipantList';
import { Summary } from './Summary';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { FormDialog } from './ui/FormDialog';
import { Toast } from './ui/Toast';
import { FixedBottomBar } from './ui/FixedBottomBar';
import { MoneyAmount } from './ui/MoneyAmount';
import { UI_MESSAGES, DEFAULT_VALUES } from '../config/constants';
import { calculateOrderTotal } from '../utils/orderCalculations';
import { splitItemEvenly, updateParticipantPortion } from '../utils/orderEdits';
import { isValidPrice } from '../utils/validation';
import type { OrderData } from '../types';

export type OrderActions = {
  onUpdateOrder: (order: OrderData) => void;
  onBack: () => void;
  onCreateInviteLink: (orderId: string) => Promise<string>;
  onAddExpense: (payload: { title: string; price: number }) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onCloseOrder: () => Promise<void>;
};

type OrderProps = {
  order: OrderData;
} & OrderActions;

type Tab = 'items' | 'participants' | 'summary';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'items', label: 'Позиции', icon: <Plus className="size-4" /> },
  { id: 'participants', label: 'Участники', icon: <Users className="size-4" /> },
  { id: 'summary', label: 'Расчёт', icon: <Calculator className="size-4" /> },
];

export function Order({
  order,
  onUpdateOrder,
  onBack,
  onCreateInviteLink,
  onAddExpense,
  onDeleteExpense,
  onCloseOrder,
}: OrderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [closedAlertOpen, setClosedAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guardClosed = (action: () => void) => {
    if (order.isClosed) {
      setClosedAlertOpen(true);
      return;
    }
    action();
  };

  const handleAddItemSubmit = async (values: Record<string, string>) => {
    const title = values.title?.trim();
    const price = parseFloat(values.price);

    if (!title) {
      setAddItemError('Введите название позиции');
      return;
    }
    if (!isValidPrice(price)) {
      setAddItemError(UI_MESSAGES.ALERT_INVALID_PRICE);
      return;
    }

    setIsSubmitting(true);
    setAddItemError(null);
    try {
      await onAddExpense({ title, price });
      setAddItemDialogOpen(false);
    } catch (error) {
      setAddItemError(error instanceof Error ? error.message : 'Не удалось добавить позицию');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patchOrder = (patch: Partial<OrderData>) => onUpdateOrder({ ...order, ...patch });

  const totalAmount = calculateOrderTotal(order.items);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <header className="bg-[#0088cc] text-white p-4 shadow-md">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-semibold">{order.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <span>{order.participants.length} участников</span>
            <span>•</span>
            <span>{order.items.length} позиций</span>
            <span>•</span>
            <MoneyAmount value={totalAmount} />
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-[#0088cc]' : 'text-gray-500'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0088cc]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-md mx-auto p-4">
          {activeTab === 'items' && (
            <ItemList
              items={order.items}
              participants={order.participants}
              onUpdateParticipantPortion={(itemId, participantId, portion) =>
                patchOrder({
                  items: updateParticipantPortion(order.items, itemId, participantId, portion),
                })
              }
              onSplitEvenly={(itemId) =>
                guardClosed(() =>
                  patchOrder({ items: splitItemEvenly(order.items, itemId, order.participants) }),
                )
              }
              onDeleteItem={(itemId) => guardClosed(() => setDeleteItemId(itemId))}
              isClosed={order.isClosed}
            />
          )}

          {activeTab === 'participants' && (
            <ParticipantList
              orderId={order.id}
              participants={order.participants}
              onCreateInviteLink={onCreateInviteLink}
            />
          )}

          {activeTab === 'summary' && (
            <Summary order={order} onUpdateOrder={onUpdateOrder} onCloseOrder={onCloseOrder} />
          )}
        </div>
      </main>

      {!order.isClosed && activeTab === 'items' && (
        <FixedBottomBar>
          <button
            onClick={() => guardClosed(() => setAddItemDialogOpen(true))}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors"
          >
            <Plus className="size-5" />
            Добавить позицию
          </button>
        </FixedBottomBar>
      )}

      <FormDialog
        open={addItemDialogOpen}
        title="Новая позиция"
        fields={[
          { name: 'title', label: 'Название', placeholder: DEFAULT_VALUES.ITEM_NAME, required: true },
          {
            name: 'price',
            label: 'Цена (₽)',
            type: 'number',
            min: 0,
            step: DEFAULT_VALUES.PRICE_STEP,
            required: true,
          },
        ]}
        submitLabel={isSubmitting ? 'Добавление...' : 'Добавить'}
        error={addItemError}
        onSubmit={handleAddItemSubmit}
        onClose={() => !isSubmitting && setAddItemDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteItemId !== null}
        title="Удалить позицию"
        message={UI_MESSAGES.CONFIRM_DELETE_ITEM}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={async () => {
          if (!deleteItemId) return;
          setIsSubmitting(true);
          try {
            await onDeleteExpense(deleteItemId);
            setDeleteItemId(null);
          } finally {
            setIsSubmitting(false);
          }
        }}
        onCancel={() => !isSubmitting && setDeleteItemId(null)}
      />

      {closedAlertOpen && (
        <Toast
          message={UI_MESSAGES.ALERT_ORDER_CLOSED}
          variant="error"
          onClose={() => setClosedAlertOpen(false)}
        />
      )}
    </div>
  );
}
