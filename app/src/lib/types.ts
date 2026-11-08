export type UserRole = 'trainer' | 'client';
export type PlanStatus = 'draft' | 'published';
export type BlockType = 'standard' | 'circuit' | 'emom' | 'amrap' | 'tabata' | 'for_time';

export interface Profile {
  id: string;
  role: UserRole;
  trainer_id: string | null;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  must_change_password: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Exercise {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  video_path: string | null;
  video_url: string | null;
  thumbnail_path: string | null;
  /** Clave de la ilustración animada (features/exercises/figure.ts) */
  animation: string | null;
  cues: string[];
  created_at: string;
}

export interface WeeklyPlan {
  id: string;
  trainer_id: string;
  client_id: string;
  title: string;
  week_start: string; // YYYY-MM-DD (lunes)
  notes: string | null;
  status: PlanStatus;
  published_at: string | null;
  created_at: string;
}

export interface PlanDay {
  id: string;
  plan_id: string;
  day_of_week: number; // 1 = lunes
  title: string;
  notes: string | null;
}

export interface WorkoutBlock {
  id: string;
  day_id: string;
  position: number;
  name: string;
  type: BlockType;
  rounds: number;
  work_seconds: number | null;
  rest_seconds: number | null;
  rest_between_rounds: number | null;
  time_cap_seconds: number | null;
  notes: string | null;
}

export interface BlockExercise {
  id: string;
  block_id: string;
  exercise_id: string;
  position: number;
  reps: string | null;
  duration_seconds: number | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface BlockExerciseWithExercise extends BlockExercise {
  exercise: Exercise;
}
export interface BlockWithExercises extends WorkoutBlock {
  block_exercises: BlockExerciseWithExercise[];
}
export interface DayWithBlocks extends PlanDay {
  workout_blocks: BlockWithExercises[];
}
export interface PlanWithDays extends WeeklyPlan {
  plan_days: DayWithBlocks[];
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  day_id: string | null;
  day_title: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  rounds_completed: number | null;
  created_at: string;
}
