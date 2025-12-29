
export type Role = 'user' | 'assistant' | 'system';

export interface Exercise {
  type: 'multiple-choice' | 'fill-in-the-blank';
  question: string;
  options?: string[]; // Only for multiple-choice
  answer: string;
  hint: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  analysis?: GrammarAnalysis;
}

export interface GrammarAnalysis {
  original: string;
  corrected: string;
  explanation_en: string;
  explanation_zh: string;
  key_points: string[];
  exercise: Exercise;
}
