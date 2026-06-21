import { useRef, useState } from 'react';
import { ArrowLeft, Calculator, Camera, Plus, Users } from 'lucide-react';
import { ItemList } from './ItemList';
import { ParticipantList } from './ParticipantList';
import { Summary } from './Summary';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { FormDialog } from './ui/FormDialog';
import { Toast } from './ui/Toast';
import { FixedBottomBar } from './ui/FixedBottomBar';
import { MoneyAmount } from './ui/MoneyAmount';
import { UI_MESSAGES } from '../config/constants';
import { calculateOrderTotal } from '../utils/orderCalculations';
import { expenseFormFields, parseExpenseForm } from '../utils/expenseForm';
import { OrderProvider } from '../contexts/OrderContext';
import type { OrderData } from '../types';
import type { ExpenseInput } from '../hooks/useOrderMutations';

export type OrderActions = {
  currentUserId: number | null;
  onUpdateOrder: (order: OrderData) => void;
  onBack: () => void;
  onCreateInviteLink: (orderId: string) => Promise<string>;
  onAddExpense: (payload: ExpenseInput) => Promise<void>;
  onImportReceipt: (file: File) => Promise<void>;
  onRefreshOrder: () => void;
  onUpdateExpense: (expenseId: string, payload: ExpenseInput) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onUpdatePayment: (participantId: string, amount: number) => Promise<void>;
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
  currentUserId,
  onUpdateOrder,
  onBack,
  onCreateInviteLink,
  onAddExpense,
  onImportReceipt,
  onRefreshOrder,
  onUpdateExpense,
  onDeleteExpense,
  onUpdatePayment,
  onCloseOrder,
}: OrderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [closedAlertOpen, setClosedAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReceiptImporting, setIsReceiptImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const editingItem = editItemId ? order.items.find((item) => item.id === editItemId) : undefined;
  const totalAmount = calculateOrderTotal(order.items);

  const guardClosed = (action: () => void) => {
    if (order.isClosed) {
      setClosedAlertOpen(true);
      return;
    }

    action();
  };

  const submitExpenseForm = async (
    values: Record<string, string>,
    action: (payload: ExpenseInput) => Promise<void>,
    onSuccess: () => void,
  ) => {
    const parsed = parseExpenseForm(values);
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await action(parsed.data);
      onSuccess();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить позицию');
    } finally {
      setIsSubmitting(false);
    }
  };

  const importReceiptFile = async (file: File) => {
    setIsReceiptImporting(true);
    try {
      await onImportReceipt(file);
      setToast({ message: 'Позиции из чека добавлены', variant: 'success' });
    } catch (error) {
      setToast({ message: getErrorMessage(error), variant: 'error' });
    } finally {
      setIsReceiptImporting(false);
    }
  };

  const handleReceiptFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    void importReceiptFile(file);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    onRefreshOrder();
  };

  return (
    <OrderProvider
      order={order}
      onUpdateOrder={onUpdateOrder}
      onRequestDeleteItem={(itemId) => setDeleteItemId(itemId)}
      onRequestEditItem={(itemId) => setEditItemId(itemId)}
      onClosedAction={() => setClosedAlertOpen(true)}
    >
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
                onClick={() => handleTabChange(tab.id)}
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
            {activeTab === 'items' && <ItemList />}

            {activeTab === 'participants' && (
              <ParticipantList
                orderId={order.id}
                participants={order.participants}
                onCreateInviteLink={onCreateInviteLink}
              />
            )}

            {activeTab === 'summary' && (
              <Summary
                order={order}
                currentUserId={currentUserId}
                canCloseOrder={order.currentUserRole === 'creator'}
                onUpdateOrder={onUpdateOrder}
                onUpdatePayment={onUpdatePayment}
                onCloseOrder={onCloseOrder}
              />
            )}
          </div>
        </main>

        {!order.isClosed && activeTab === 'items' && (
          <FixedBottomBar>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReceiptFileChange}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => guardClosed(() => receiptInputRef.current?.click())}
                disabled={isReceiptImporting}
                className="shrink-0 bg-white text-[#0088cc] border border-[#0088cc]/30 rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 hover:bg-[#eef8fd] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Сфотографировать чек"
              >
                <Camera className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => guardClosed(() => setAddItemDialogOpen(true))}
                disabled={isReceiptImporting}
                className="flex-1 bg-[#0088cc] text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="size-5" />
                {isReceiptImporting ? 'Импорт чека...' : 'Добавить позицию'}
              </button>
            </div>
          </FixedBottomBar>
        )}

        <FormDialog
          open={addItemDialogOpen}
          title="Новая позиция"
          fields={expenseFormFields()}
          submitLabel={isSubmitting ? 'Добавление...' : 'Добавить'}
          error={formError}
          onSubmit={(values) =>
            submitExpenseForm(values, onAddExpense, () => setAddItemDialogOpen(false))
          }
          onClose={() => !isSubmitting && setAddItemDialogOpen(false)}
        />

        <FormDialog
          open={editItemId !== null && !!editingItem}
          title="Редактировать позицию"
          fields={expenseFormFields(editingItem)}
          submitLabel={isSubmitting ? 'Сохранение...' : 'Сохранить'}
          error={formError}
          onSubmit={(values) => {
            if (!editItemId) return;
            submitExpenseForm(
              values,
              (payload) => onUpdateExpense(editItemId, payload),
              () => setEditItemId(null),
            );
          }}
          onClose={() => !isSubmitting && setEditItemId(null)}
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

        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </OrderProvider>
  );
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Не удалось импортировать чек';
}
