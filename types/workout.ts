export interface BodyGroup {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  bodyGroupId: string;
  bodyGroupName?: string;
}

export interface WorkoutTemplateExercise {
  exerciseId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
}

export interface WorkoutTemplate {
  id?: string;
  name: string;
  bodyGroups: string[]; // IDs of body groups
  exercises: WorkoutTemplateExercise[];
}

export interface WorkoutExerciseEntry {
  id?: string;
  workoutPlanId: string;
  exerciseId: string;
  exerciseName?: string;
  sets: number;
  reps: number;
  maxWeight: number;
}

export interface WeeklyWorkoutPlan {
  id?: string;
  date: string;
  name: string;
  templateId?: string;
  templateName?: string;
  exercises?: WorkoutExerciseEntry[];
}
