import type { ParticipantViewModel } from '../types/leaderboard';
import { ParticipantCard } from './ParticipantCard';

interface ParticipantListProps {
  participants: ParticipantViewModel[];
  expandedParticipantId: string | null;
  onToggleParticipant: (id: string) => void;
}

export function ParticipantList({
  participants,
  expandedParticipantId,
  onToggleParticipant,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return <div className="leaderboard-empty">No participants found for the selected filters.</div>;
  }

  return (
    <section className="participant-list" aria-label="Ranked participant list">
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.participant.id}
          participant={participant}
          isExpanded={expandedParticipantId === participant.participant.id}
          onToggle={onToggleParticipant}
        />
      ))}
    </section>
  );
}
