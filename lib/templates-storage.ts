import { WorkoutTemplate } from "@/types/workout";

// In a real app, you'd store this in a database or localStorage
// For now, we'll use in-memory storage with some default templates
const templates: WorkoutTemplate[] = [
  {
    id: "1",
    name: "Chest & Triceps",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Bench Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Push-ups",
        defaultSets: 3,
        defaultReps: 15,
      },
      {
        exerciseId: "",
        exerciseName: "Tricep Dips",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Skull Crushers",
        defaultSets: 3,
        defaultReps: 10,
      },
    ],
  },
  {
    id: "2",
    name: "Back & Biceps",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Pull-ups",
        defaultSets: 3,
        defaultReps: 10,
      },
      { exerciseId: "", exerciseName: "Rows", defaultSets: 3, defaultReps: 12 },
      {
        exerciseId: "",
        exerciseName: "Bicep Curls",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Hammer Curls",
        defaultSets: 3,
        defaultReps: 12,
      },
    ],
  },
  {
    id: "3",
    name: "Back",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Pull-ups",
        defaultSets: 3,
        defaultReps: 10,
      },
      { exerciseId: "", exerciseName: "Rows", defaultSets: 3, defaultReps: 12 },
    ],
  },
  {
    id: "4",
    name: "Biceps",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Bicep Curls",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Hammer Curls",
        defaultSets: 3,
        defaultReps: 12,
      },
    ],
  },
  {
    id: "5",
    name: "Shoulders",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Shoulder Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Lateral Raises",
        defaultSets: 3,
        defaultReps: 12,
      },
    ],
  },
  {
    id: "6",
    name: "Legs",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Squats",
        defaultSets: 4,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Lunges",
        defaultSets: 3,
        defaultReps: 12,
      },
    ],
  },
  {
    id: "7",
    name: "Shoulders & Legs",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Shoulder Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Lateral Raises",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Squats",
        defaultSets: 4,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Lunges",
        defaultSets: 3,
        defaultReps: 12,
      },
    ],
  },
  {
    id: "8",
    name: "Shoulders & Triceps",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Shoulder Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Lateral Raises",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Tricep Dips",
        defaultSets: 3,
        defaultReps: 12,
      },
      {
        exerciseId: "",
        exerciseName: "Skull Crushers",
        defaultSets: 3,
        defaultReps: 10,
      },
    ],
  },
  {
    id: "9",
    name: "Core",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Planks",
        defaultSets: 3,
        defaultReps: 60,
      },
      {
        exerciseId: "",
        exerciseName: "Crunches",
        defaultSets: 3,
        defaultReps: 20,
      },
    ],
  },
  {
    id: "10",
    name: "Climbing",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Bouldering",
        defaultSets: 1,
        defaultReps: 1,
      },
    ],
  },
  {
    id: "11",
    name: "Full Body",
    bodyGroups: [],
    exercises: [
      {
        exerciseId: "",
        exerciseName: "Squats",
        defaultSets: 4,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Bench Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Pull-ups",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        exerciseId: "",
        exerciseName: "Shoulder Press",
        defaultSets: 3,
        defaultReps: 10,
      },
      { exerciseId: "", exerciseName: "Rows", defaultSets: 3, defaultReps: 12 },
      {
        exerciseId: "",
        exerciseName: "Planks",
        defaultSets: 3,
        defaultReps: 60,
      },
    ],
  },
];

export const getTemplates = (): WorkoutTemplate[] => {
  return templates;
};

export const getTemplateById = (id: string): WorkoutTemplate | undefined => {
  return templates.find((t) => t.id === id);
};

export const createTemplate = (
  template: Omit<WorkoutTemplate, "id">
): WorkoutTemplate => {
  const newTemplate = {
    ...template,
    id: Date.now().toString(),
  };
  templates.push(newTemplate);
  return newTemplate;
};

export const updateTemplate = (
  id: string,
  template: Partial<WorkoutTemplate>
): WorkoutTemplate | null => {
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return null;
  templates[index] = { ...templates[index], ...template };
  return templates[index];
};

export const deleteTemplate = (id: string): boolean => {
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return false;
  templates.splice(index, 1);
  return true;
};
