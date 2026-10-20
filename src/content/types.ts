export const MODULE_IDS = ['pencil', 'crayon', 'paint', 'play', 'color', 'composition', 'observe'] as const;
export type ModuleId = typeof MODULE_IDS[number];
export interface Lesson {
  id: string;
  module: ModuleId;
  order: number;
  title: string;
  level: 1 | 2 | 3;
  goal: string;
  activityMinutes: number;
  materials: string[];
  anim: string;
  try: string[];
  notice: string[];
  hint: string;
  useIdeas: string[];
  related: string[];
  tags: string[];
  teacherNote: { preparation: string; support: string; prompt: string };
  safety: string[];
  review: { status: 'unverified'; conditions: string };
}
export interface ChallengeExample {
  id: string;
  title: string;
  image: string;
  motif: string;
  colors: string[];
  layout: string;
  techniques: string[];
  description: string;
}
export interface Challenge {
  id: string;
  title: string;
  lessons: string[];
  invitation: string;
  materials: string[];
  safety: string[];
  examples: ChallengeExample[];
}
export interface TeacherSet { id: string; title: string; lessons: string[]; prompt: string }
export interface Catalog { lessons: Lesson[]; challenges: Challenge[]; teacherSets: TeacherSet[] }
