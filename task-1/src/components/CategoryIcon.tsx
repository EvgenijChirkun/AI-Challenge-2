import { GraduationCap, Handshake, Mic2 } from 'lucide-react';
import type { Category } from '../types/leaderboard';

interface CategoryIconProps {
  category: Category;
  className?: string;
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  if (category === 'education') {
    return <GraduationCap className={className} aria-hidden="true" />;
  }

  if (category === 'publicSpeaking') {
    return <Mic2 className={className} aria-hidden="true" />;
  }

  return <Handshake className={className} aria-hidden="true" />;
}
