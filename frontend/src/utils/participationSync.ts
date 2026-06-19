import type { ParticipantPortion } from '../types';

export function portionsEqual(left: ParticipantPortion[], right: ParticipantPortion[]): boolean {
  if (left.length !== right.length) return false;

  const sortKey = (portion: ParticipantPortion) => `${portion.participantId}:${portion.portion}`;
  const leftSorted = [...left].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const rightSorted = [...right].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  return leftSorted.every(
    (portion, index) =>
      portion.participantId === rightSorted[index].participantId &&
      portion.portion === rightSorted[index].portion,
  );
}

export function toParticipationPayload(participants: ParticipantPortion[]) {
  return participants
    .filter((participant) => participant.portion > 0)
    .map((participant) => ({
      userId: Number.parseInt(participant.participantId, 10),
      share: participant.portion,
    }))
    .filter((participant) => !Number.isNaN(participant.userId));
}
