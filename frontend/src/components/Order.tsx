import { useState } from 'react';
import { ArrowLeft, Plus, Users, Calculator } from 'lucide-react';
import { ItemList } from './ItemList';
import { ParticipantList } from './ParticipantList';
import { Summary } from './Summary';
import { UI_MESSAGES } from '../config/constants';
import { isValidPrice, createOrderItem, createParticipant } from '../utils/orderHelpers';
import type { OrderData } from '../types';

type OrderProps = {
  order: OrderData;
  onUpdateOrder: (order: OrderData) => void;
  onBack: () => void;
  onCreateInviteLink: (orderId: string) => Promise<string>;
};

type Tab = 'items' | 'participants' | 'summary';

export function Order({ order, onUpdateOrder, onBack, onCreateInviteLink }: OrderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('items');

  const handleAddItem = () => {
    if (order.isClosed) {
      alert(UI_MESSAGES.ALERT_ORDER_CLOSED);
      return;
    }

    const itemName = prompt('Название позиции:');
    if (!itemName) return;

    const itemPrice = prompt('Цена:');
    if (!itemPrice) return;

    const price = parseFloat(itemPrice);
    if (!isValidPrice(price)) {
      alert(UI_MESSAGES.ALERT_INVALID_PRICE);
      return;
    }

    const newItem = createOrderItem(itemName, price);
    onUpdateOrder({
      ...order,
      items: [...order.items, newItem],
    });
  };

  const handleAddParticipant = () => {
    if (order.isClosed) {
      alert(UI_MESSAGES.ALERT_ORDER_CLOSED);
      return;
    }

    const participantName = prompt('Имя участника:');
    if (!participantName) return;

    const newParticipant = createParticipant(participantName, order.participants.length);
    onUpdateOrder({
      ...order,
      participants: [...order.participants, newParticipant],
    });
  };

  const handleUpdateParticipantPortion = (itemId: string, participantId: string, portion: number) => {
    const updatedItems = order.items.map((item) => {
      if (item.id === itemId) {
        const existingIndex = item.participants.findIndex((p) => p.participantId === participantId);

        if (portion === 0) {
          return {
            ...item,
            participants: item.participants.filter((p) => p.participantId !== participantId),
          };
        }

        if (existingIndex >= 0) {
          const newParticipants = [...item.participants];
          newParticipants[existingIndex] = { participantId, portion };
          return {
            ...item,
            participants: newParticipants,
          };
        }

        return {
          ...item,
          participants: [...item.participants, { participantId, portion }],
        };
      }
      return item;
    });

    onUpdateOrder({
      ...order,
      items: updatedItems,
    });
  };

  const handleSplitEvenly = (itemId: string) => {
    if (order.isClosed) {
      alert(UI_MESSAGES.ALERT_ORDER_CLOSED);
      return;
    }

    const portionPerPerson = 1 / order.participants.length;

    const updatedItems = order.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          participants: order.participants.map((p) => ({
            participantId: p.id,
            portion: portionPerPerson,
          })),
        };
      }
      return item;
    });

    onUpdateOrder({
      ...order,
      items: updatedItems,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm(UI_MESSAGES.CONFIRM_DELETE_ITEM)) {
      onUpdateOrder({
        ...order,
        items: order.items.filter((item) => item.id !== itemId),
      });
    }
  };

  const handleDeleteParticipant = (participantId: string) => {
    if (order.participants.length === 1) {
      alert(UI_MESSAGES.CONFIRM_LAST_PARTICIPANT);
      return;
    }

    if (confirm(UI_MESSAGES.CONFIRM_DELETE_PARTICIPANT)) {
      const updatedItems = order.items.map((item) => ({
        ...item,
        participants: item.participants.filter((p) => p.participantId !== participantId),
      }));

      onUpdateOrder({
        ...order,
        participants: order.participants.filter((p) => p.id !== participantId),
        items: updatedItems,
      });
    }
  };

  const totalAmount = order.items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-[#0088cc] text-white p-4 shadow-md">
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
            <span>{totalAmount.toFixed(2)} ₽</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="max-w-md mx-auto p-4">
          {activeTab === 'items' && (
            <ItemList
              items={order.items}
              participants={order.participants}
              onUpdateParticipantPortion={handleUpdateParticipantPortion}
              onSplitEvenly={handleSplitEvenly}
              onDeleteItem={handleDeleteItem}
              isClosed={order.isClosed}
            />
          )}

          {activeTab === 'participants' && (
            <ParticipantList
              orderId={order.id}
              participants={order.participants}
              onDeleteParticipant={handleDeleteParticipant}
              onCreateInviteLink={onCreateInviteLink}
              isClosed={order.isClosed}
            />
          )}

          {activeTab === 'summary' && <Summary order={order} onUpdateOrder={onUpdateOrder} />}
        </div>
      </div>

      {/* Action Button */}
      {!order.isClosed && activeTab !== 'summary' && (
        <FixedActionButton activeTab={activeTab} onAddItem={handleAddItem} onAddParticipant={handleAddParticipant} />
      )}
    </div>
  );
}

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'items', label: 'Позиции', icon: <Plus className="size-4" /> },
    { id: 'participants', label: 'Участники', icon: <Users className="size-4" /> },
    { id: 'summary', label: 'Расчёт', icon: <Calculator className="size-4" /> },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-[#0088cc]' : 'text-gray-500'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0088cc]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FixedActionButtonProps {
  activeTab: Tab;
  onAddItem: () => void;
  onAddParticipant: () => void;
}

function FixedActionButton({ activeTab, onAddItem, onAddParticipant }: FixedActionButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="max-w-md mx-auto">
        {activeTab === 'items' && (
          <button
            onClick={onAddItem}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors"
          >
            <Plus className="size-5" />
            Добавить позицию
          </button>
        )}

        {activeTab === 'participants' && (
          <button
            onClick={onAddParticipant}
            className="w-full bg-[#0088cc] text-white rounded-xl py-3 px-4 font-medium flex items-center justify-center gap-2 hover:bg-[#0077bb] transition-colors"
          >
            <Plus className="size-5" />
            Добавить участника
          </button>
        )}
      </div>
    </div>
  );
}
