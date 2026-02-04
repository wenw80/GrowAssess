import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUniqueLink(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
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
