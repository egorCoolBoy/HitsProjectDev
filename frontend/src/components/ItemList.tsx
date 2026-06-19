import { useEffect, useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { DEFAULT_VALUES } from '../config/constants';
import { calculateTotalPortions, isPortionValid } from '../utils/orderCalculations';
import { isValidPortion } from '../utils/validation';
import { ParticipantAvatar } from './ui/ParticipantAvatar';
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

    const portion = parseFloat(value);
    if (Number.isNaN(portion) || !isValidPortion(portion)) return;

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
  const [draft, setDraft] = useState(() => formatPortionDraft(portion));

  useEffect(() => {
    setDraft(formatPortionDraft(portion));
  }, [portion]);

  const commitDraft = (value: string) => {
    if (value === '' || value === '.') {
      setDraft('');
      onPortionChange(itemId, participant.id, '0');
      return;
    }

    const num = parseFloat(value);
    if (Number.isNaN(num) || !isValidPortion(num)) {
      setDraft(formatPortionDraft(portion));
      return;
    }

    setDraft(value);
    onPortionChange(itemId, participant.id, value);
  };

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
      <div className="flex items-center gap-2 flex-1">
        <ParticipantAvatar name={participant.name} color={participant.color} size="sm" />
        <span className="text-sm font-medium text-gray-800">{participant.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0.00}
          max={1.00}
          step={DEFAULT_VALUES.PORTION_STEP}
          value={draft}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);

            if (value !== '' && isValidPortion(value)) {
              onPortionChange(itemId, participant.id, value);
            }
          }}
          onBlur={() => commitDraft(draft)}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function formatPortionDraft(portion: number): string {
  return portion === 0 ? '' : String(portion);
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
