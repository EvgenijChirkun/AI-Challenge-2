export type Category = 'education' | 'publicSpeaking' | 'universityPartnership';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Activity {
  id: string;
  title: string;
  category: Category;
  date: string;
  quarter: Quarter;
  year: number;
  points: number;
}

export interface Participant {
  id: string;
  displayName: string;
  roleTitle: string;
  avatarSeed: string;
  activities: Activity[];
}

export interface ParticipantViewModel {
  participant: Participant;
  rank: number;
  totalPoints: number;
  categoryTotals: Record<Category, number>;
  visibleActivities: Activity[];
}

export interface LeaderboardFilters {
  year: 'all' | number;
  quarter: 'all' | Quarter;
  category: 'all' | Category;
  search: string;
}
