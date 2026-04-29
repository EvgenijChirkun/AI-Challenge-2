import { GraduationCap, Handshake, Monitor } from 'lucide-react';
import type { Category } from '../types/leaderboard';

interface CategoryIconProps {
  category: Category;
  className?: string;
  variant?: 'default' | 'metric';
}

export function CategoryIcon({ category, className, variant = 'default' }: CategoryIconProps) {
  if (variant === 'metric') {
    if (category === 'education') {
      return <GraduationCap className={className} aria-hidden="true" />;
    }

    if (category === 'publicSpeaking') {
      return <Monitor className={className} aria-hidden="true" />;
    }

    return <Handshake className={className} aria-hidden="true" />;
  }

  if (category === 'education') {
    return <GraduationCap className={className} aria-hidden="true" />;
  }

  if (category === 'publicSpeaking') {
    return <Monitor className={className} aria-hidden="true" />;
  }

  return <Handshake className={className} aria-hidden="true" />;
}
