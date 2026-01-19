import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUniqueLink(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateScore(
  responses: Array<{ isCorrect?: boolean | null; score?: number | null; question: { points: number } }>
): { obtained: number; total: number; percentage: number } {
  const total = responses.reduce((sum, r) => sum + r.question.points, 0);
  const obtained = responses.reduce((sum, r) => {
    if (r.score !== null && r.score !== undefined) return sum + r.score;
    if (r.isCorrect) return sum + r.question.points;
    return sum;
  }, 0);
  const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
  return { obtained, total, percentage };
}
