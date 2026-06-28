import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import { DEFAULT_VALUES } from '../config/constants';
import { useOrderContext } from '../contexts/OrderContext';
import { calculateTotalPortions, getItemTotal, isPortionValid } from '../utils/orderCalculations';
import { isValidPortion } from '../utils/validation';
import { ParticipantAvatar } from './ui/ParticipantAvatar';
import { MoneyAmount } from './ui/MoneyAmount';
import type { OrderItem, Participant } from '../types';

export function ItemList() {
  const { order, isClosed, requestDeleteItem } = useOrderContext();

  if (order.items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="mb-2">Пока нет позиций</p>
        <p className="text-sm">Нажмите кнопку ниже, чтобы добавить первую позицию</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {order.items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          participants={order.participants}
          isClosed={isClosed}
          onDeleteItem={requestDeleteItem}
        />
      ))}
    </div>
  );
}

type ItemCardProps = {
  item: OrderItem;
  participants: Participant[];
  isClosed: boolean;
  onDeleteItem: (itemId: string) => void;
};

function ItemCard({ item, participants, isClosed, onDeleteItem }: ItemCardProps) {
  const { splitItemEvenly, requestEditItem } = useOrderContext();
  const totalPortions = calculateTotalPortions(item.participants);
  const isValid = isPortionValid(totalPortions);
  const itemTotal = getItemTotal(item);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-800">{item.name}</h3>
            <p className="text-lg font-semibold text-[#0088cc] mt-1">
              <MoneyAmount value={itemTotal} />
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {item.unitPrice.toFixed(2)} ₽ × {item.quantity}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => requestEditItem(item.id)}
              disabled={isClosed}
              className="p-2 text-gray-400 hover:text-[#0088cc] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Редактировать позицию"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              disabled={isClosed}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Удалить позицию"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {participants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Отметьте, кто участвовал в затрате:</p>
              <button
                onClick={() => splitItemEvenly(item.id)}
                disabled={isClosed || item.participants.length === 0}
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
                  portion={item.participants.find((p) => p.participantId === participant.id)?.portion ?? 0}
                  isParticipating={item.participants.some(
                    (p) => p.participantId === participant.id,
                  )}
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

type ParticipantInputProps = {
  participant: Participant;
  itemId: string;
  portion: number;
  isParticipating: boolean;
  disabled: boolean;
};

function ParticipantInput({
  participant,
  itemId,
  portion,
  isParticipating,
  disabled,
}: ParticipantInputProps) {
  const { toggleParticipation, updatePortion } = useOrderContext();
  const [draft, setDraft] = useState(() => formatPortionDraft(portion));
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraft(formatPortionDraft(portion));
    }
  }, [portion]);

  const commitDraft = (value: string) => {
    if (value === '' || value === '.') {
      setDraft(formatPortionDraft(portion));
      return;
    }

    const num = parseFloat(value);
    if (Number.isNaN(num) || !isValidPortion(num)) {
      setDraft(formatPortionDraft(portion));
      return;
    }

    setDraft(String(num));
    updatePortion(itemId, participant.id, num);
  };

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isParticipating}
          disabled={disabled}
          onChange={(event) =>
            toggleParticipation(itemId, participant.id, event.target.checked)
          }
          className="size-4 accent-[#0088cc] disabled:cursor-not-allowed"
          aria-label={`${participant.name}: участвует в затрате`}
        />
        <ParticipantAvatar name={participant.name} color={participant.color} size="sm" />
        <span className="text-sm font-medium text-gray-800">{participant.name}</span>
      </label>

      <input
        type="number"
        min={0}
        max={1}
        step={DEFAULT_VALUES.PORTION_STEP}
        value={draft}
        onFocus={() => {
          isEditingRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          isEditingRef.current = false;
          commitDraft(draft);
        }}
        disabled={disabled || !isParticipating}
        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder={isParticipating ? '0' : '—'}
      />
    </div>
  );
}

function formatPortionDraft(portion: number): string {
  return portion === 0 ? '' : String(portion);
}

type PortionSummaryProps = {
  totalPortions: number;
  isValid: boolean;
};

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
