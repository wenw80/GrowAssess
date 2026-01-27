export type QuestionType = 'mcq' | 'freetext' | 'timed';

export interface MCQOption {
  id: string;
  text: string;
  points: number;
}

export interface QuestionFormData {
  id?: string;
  type: QuestionType;
  content: string;
  options?: MCQOption[];
  correctAnswer?: string;
  timeLimitSeconds?: number;
  points: number;
  order: number;
}

export interface TestFormData {
  title: string;
  description?: string;
  category?: string;
  durationMinutes?: number;
  questions: QuestionFormData[];
}

export interface CandidateFormData {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  status: string;
  notes?: string;
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed';
export type CandidateStatus = 'active' | 'hired' | 'rejected' | 'pending';
