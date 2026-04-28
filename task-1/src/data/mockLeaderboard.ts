import type { Activity, Category, Participant, Quarter } from '../types/leaderboard';

const participantNames = [
  'Alex Nova',
  'Mira Stone',
  'Leo Vale',
  'Nina Park',
  'Oscar Reed',
  'Aria Wells',
  'Theo Gray',
  'Luna Cross',
  'Ivy Shore',
  'Jasper Lane',
  'Sage Rowan',
  'Milo Hart',
  'Zara Flint',
  'Noah Crest',
  'Clara Bloom',
  'Eli Frost',
  'Maya Quinn',
  'Rory Vale',
  'Tessa Dawn',
  'Kai Ember',
  'Nora Field',
  'Owen Slate',
  'Piper Vale',
  'Reed Hollow',
  'Cora West',
  'Dylan Skye',
  'Freya Lark',
  'Gavin Moor',
];

const roleTitles = [
  'Solution Engineer',
  'Product Specialist',
  'Learning Contributor',
  'Community Mentor',
  'Technical Advocate',
  'Platform Analyst',
  'Delivery Consultant',
];

const categories: Category[] = ['education', 'publicSpeaking', 'universityPartnership'];
const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const monthByQuarter: Record<Quarter, string[]> = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
};

const activityTitleLibrary: Record<Category, string[]> = {
  education: [
    'Learning Sprint Guide',
    'Knowledge Capsule Series',
    'Skills Studio Workshop',
    'Playbook Refresh Session',
    'Foundations Lab Briefing',
  ],
  publicSpeaking: [
    'Spotlight Talk Circuit',
    'Lightning Session Showcase',
    'Storytelling Practice Forum',
    'Demo Stage Roundup',
    'Insight Broadcast Panel',
  ],
  universityPartnership: [
    'Campus Outreach Briefing',
    'Student Mentor Exchange',
    'Academic Innovation Meet-up',
    'Future Talent Collaboration',
    'Lab Partnership Session',
  ],
};

function createActivity(
  participantIndex: number,
  activityIndex: number,
  quarter: Quarter,
  category: Category,
): Activity {
  const titleOptions = activityTitleLibrary[category];
  const title = titleOptions[(participantIndex + activityIndex) % titleOptions.length];
  const monthOptions = monthByQuarter[quarter];
  const month = monthOptions[(participantIndex + activityIndex) % monthOptions.length];
  const day = String(6 + ((participantIndex * 3 + activityIndex * 5) % 19)).padStart(2, '0');
  const baseline = Math.max(10, 42 - participantIndex);
  const points = baseline + (4 - activityIndex) * 3 + (participantIndex % 4) * 2;

  return {
    id: `activity-${participantIndex + 1}-${activityIndex + 1}`,
    title,
    category,
    date: `2025-${month}-${day}`,
    quarter,
    year: 2025,
    points,
  };
}

export const mockParticipants: Participant[] = participantNames.map(
  (displayName, participantIndex) => {
    const activities = quarters.map((quarter, activityIndex) => {
      const category = categories[(participantIndex + activityIndex) % categories.length];
      return createActivity(participantIndex, activityIndex, quarter, category);
    });

    return {
      id: `participant-${participantIndex + 1}`,
      displayName,
      roleTitle: roleTitles[participantIndex % roleTitles.length],
      avatarSeed: `seed-${participantIndex + 1}`,
      activities,
    };
  },
);
