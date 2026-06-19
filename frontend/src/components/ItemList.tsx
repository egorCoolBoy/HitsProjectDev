import { Trash2, Users } from 'lucide-react';
import { calculateTotalPortions, isPortionValid } from '../utils/calculators';
import { isValidPortion } from '../utils/orderHelpers';
import type { OrderItem, Participant } from '../types';

type ItemListProps = {
  items: OrderItem[];
  participants: Participant[];
  onUpdateParticipantPortion: (itemId: string, participantId: string, portion: number) => void;
  onSplitEvenly: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  isClosed?: boolean;
};

export function ItemList({
  items,
  participants,
  onUpdateParticipantPortion,
  onSplitEvenly,
  onDeleteItem,
  isClosed = false,
}: ItemListProps) {
  const handlePortionChange = (itemId: string, participantId: string, value: string) => {
    if (isClosed) return;
    if (!isValidPortion(value)) return;

    const portion = parseFloat(value);
    onUpdateParticipantPortion(itemId, participantId, portion);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="mb-2">Пока нет позиций</p>
        <p className="text-sm">Нажмите кнопку ниже, чтобы добавить первую позицию</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          participants={participants}
          onUpdateParticipantPortion={handlePortionChange}
          onSplitEvenly={onSplitEvenly}
          onDeleteItem={onDeleteItem}
          isClosed={isClosed}
        />
      ))}
    </div>
  );
}

interface ItemCardProps {
  item: OrderItem;
  participants: Participant[];
  onUpdateParticipantPortion: (itemId: string, participantId: string, value: string) => void;
  onSplitEvenly: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  isClosed: boolean;
}

function ItemCard({
  item,
  participants,
  onUpdateParticipantPortion,
  onSplitEvenly,
  onDeleteItem,
  isClosed,
}: ItemCardProps) {
  const totalPortions = calculateTotalPortions(item.participants);
  const isValid = isPortionValid(totalPortions);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-800">{item.name}</h3>
            <p className="text-lg font-semibold text-[#0088cc] mt-1">{item.price.toFixed(2)} ₽</p>
          </div>
          <button
            onClick={() => onDeleteItem(item.id)}
            disabled={isClosed}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {participants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Кто ест (введите части от 0 до 1):</p>
              <button
                onClick={() => onSplitEvenly(item.id)}
                disabled={isClosed}
                className="text-xs bg-[#0088cc] text-white px-2 py-1 rounded-lg hover:bg-[#0077bb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Users className="size-3" />
                Поровну
              </button>
            </div>
            <div className="space-y-2">
              {participants.map((participant) => (
                <ParticipantInput
                  key={participant.id}
                  participant={participant}
                  itemId={item.id}
                  portion={item.participants.find((p) => p.participantId === participant.id)?.portion || 0}
                  onPortionChange={onUpdateParticipantPortion}
                  disabled={isClosed}
                />
              ))}
            </div>

            <PortionSummary totalPortions={totalPortions} isValid={isValid} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantInputProps {
  participant: Participant;
  itemId: string;
  portion: number;
  onPortionChange: (itemId: string, participantId: string, value: string) => void;
  disabled: boolean;
}

function ParticipantInput({ participant, itemId, portion, onPortionChange, disabled }: ParticipantInputProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
      <div className="flex items-center gap-2 flex-1">
        <div
          className="size-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ backgroundColor: participant.color }}
        >
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-800">{participant.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={portion}
          onChange={(e) => onPortionChange(itemId, participant.id, e.target.value)}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="0"
        />
      </div>
    </div>
  );
}

interface PortionSummaryProps {
  totalPortions: number;
  isValid: boolean;
}

function PortionSummary({ totalPortions, isValid }: PortionSummaryProps) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className={`flex justify-between text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
        <span className="font-medium">Всего частей:</span>
        <span className="font-bold">
          {totalPortions.toFixed(2)} / 1.00
          {isValid ? ' ✓' : ' ⚠️'}
        </span>
      </div>
      {!isValid && totalPortions > 0 && (
        <p className="text-xs text-red-600 mt-1">Сумма частей должна быть равна 1</p>
      )}
    </div>
  );
}
