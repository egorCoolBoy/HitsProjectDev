import { Trash2, Share2 } from 'lucide-react';
import type { Participant } from '../app/App';

type ParticipantListProps = {
  participants: Participant[];
  onDeleteParticipant: (participantId: string) => void;
  isClosed?: boolean;
};

export function ParticipantList({ participants, onDeleteParticipant, isClosed = false }: ParticipantListProps) {
  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'Присоединяйтесь к заказу в SplitBot',
        text: 'Нажмите на ссылку, чтобы присоединиться к совместному заказу',
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Ссылка скопирована в буфер обмена!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#0088cc]/10 to-[#0066aa]/10 rounded-xl p-4 border border-[#0088cc]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800 mb-1">Пригласить участников</h3>
            <p className="text-sm text-gray-600">Поделитесь ссылкой на заказ</p>
          </div>
          <button
            onClick={handleShare}
            className="bg-[#0088cc] text-white p-3 rounded-xl hover:bg-[#0077bb] transition-colors"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-gray-800">{participant.name}</span>
            </div>
            {participants.length > 1 && !isClosed && (
              <button
                onClick={() => onDeleteParticipant(participant.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
