import { Trash2, Share2 } from 'lucide-react';
import { UI_MESSAGES, SHARE_INVITE } from '../config/constants';
import type { Participant } from '../types';

type ParticipantListProps = {
  orderId: string;
  participants: Participant[];
  onDeleteParticipant: (participantId: string) => void;
  onCreateInviteLink: (orderId: string) => Promise<string>;
  isClosed?: boolean;
};

export function ParticipantList({
  orderId,
  participants,
  onDeleteParticipant,
  onCreateInviteLink,
  isClosed = false,
}: ParticipantListProps) {
  const handleShare = async () => {
    try {
      const shareUrl = await onCreateInviteLink(orderId);

      if (navigator.share) {
        await navigator.share({
          title: SHARE_INVITE.TITLE,
          text: SHARE_INVITE.TEXT,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert(UI_MESSAGES.ALERT_INVITE_LINK_COPIED);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : UI_MESSAGES.ALERT_INVITE_LINK_ERROR);
    }
  };

  return (
    <div className="space-y-4">
      <InviteCard onShare={handleShare} />

      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantItem
            key={participant.id}
            participant={participant}
            canDelete={participants.length > 1 && !isClosed}
            onDelete={onDeleteParticipant}
          />
        ))}
      </div>
    </div>
  );
}

interface InviteCardProps {
  onShare: () => void;
}

function InviteCard({ onShare }: InviteCardProps) {
  return (
    <div className="bg-gradient-to-r from-[#0088cc]/10 to-[#0066aa]/10 rounded-xl p-4 border border-[#0088cc]/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800 mb-1">Пригласить участников</h3>
          <p className="text-sm text-gray-600">Поделитесь ссылкой на заказ</p>
        </div>
        <button
          onClick={onShare}
          className="bg-[#0088cc] text-white p-3 rounded-xl hover:bg-[#0077bb] transition-colors"
        >
          <Share2 className="size-5" />
        </button>
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
  canDelete: boolean;
  onDelete: (participantId: string) => void;
}

function ParticipantItem({ participant, canDelete, onDelete }: ParticipantItemProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: participant.color }}
        >
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-800">{participant.name}</span>
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(participant.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
