import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { UI_MESSAGES, SHARE_INVITE } from '../config/constants';
import { Toast } from './ui/Toast';
import { ParticipantAvatar } from './ui/ParticipantAvatar';
import type { Participant } from '../types';

type ParticipantListProps = {
  orderId: string;
  participants: Participant[];
  onCreateInviteLink: (orderId: string) => Promise<string>;
};

export function ParticipantList({
  orderId,
  participants,
  onCreateInviteLink,
}: ParticipantListProps) {
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

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
        setToast({ message: UI_MESSAGES.ALERT_INVITE_LINK_COPIED, variant: 'success' });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setToast({
        message: error instanceof Error ? error.message : UI_MESSAGES.ALERT_INVITE_LINK_ERROR,
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <InviteCard onShare={handleShare} />

      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantItem key={participant.id} participant={participant} />
        ))}
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
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
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ParticipantAvatar name={participant.name} color={participant.color} />
        <span className="font-medium text-gray-800">{participant.name}</span>
      </div>
    </div>
  );
}
