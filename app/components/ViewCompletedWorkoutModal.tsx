"use client";

import { useState, useEffect } from "react";

interface ExerciseData {
  pageId: string;
  exerciseId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  actualSets: number;
  actualReps: number;
  maxWeight: number;
  completed: boolean;
  personalBest: number;
}

interface ViewCompletedWorkoutModalProps {
  isOpen: boolean;
  date: string;
  onClose: () => void;
}

export function ViewCompletedWorkoutModal({
  isOpen,
  date,
  onClose,
}: ViewCompletedWorkoutModalProps) {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [workoutName, setWorkoutName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && date) {
      loadWorkoutData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, date]);

  const loadWorkoutData = async () => {
    setLoading(true);
    try {
      // Fetch workouts for this date
      const workoutsResponse = await fetch(
        `/api/workouts?startDate=${date}&endDate=${date}`
      );
      const workouts = await workoutsResponse.json();

      if (workouts.length > 0) {
        // Extract workout name from first entry
        const firstParts = workouts[0].name.split(" - ");
        setWorkoutName(firstParts[0] || "Workout");

        // Get all exercise IDs
        const exerciseIds = workouts.map((w: any) => w.exerciseId);

        // Fetch personal bests
        const bestsResponse = await fetch("/api/exercises/best", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseIds }),
        });
        const bests = await bestsResponse.json();

        // Map workouts to exercise data
        const exerciseData: ExerciseData[] = workouts.map((workout: any) => {
          // Extract exercise name from each workout's name
          const parts = workout.name.split(" - ");
          const exerciseName = parts.slice(1).join(" - ") || workout.name;

          return {
            pageId: workout.id,
            exerciseId: workout.exerciseId,
            exerciseName,
            defaultSets: workout.sets || 0,
            defaultReps: workout.reps || 0,
            actualSets: workout.sets || 0,
            actualReps: workout.reps || 0,
            maxWeight: workout.maxWeight || 0,
            completed: workout.completed || false,
            personalBest: bests[workout.exerciseId] || 0,
          };
        });

        setExercises(exerciseData);
      }
    } catch (error) {
      console.error("Error loading workout data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {workoutName}
            </h2>
            <p className="text-sm text-gray-600">
              {new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
              ✓ Completed
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-12 w-12 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No exercises found for this workout.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise) => (
                <div
                  key={exercise.pageId}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {exercise.exerciseName}
                      </h3>
                      {exercise.personalBest > 0 && (
                        <p className="text-sm text-blue-600 font-medium">
                          Personal Best: {exercise.personalBest} lbs
                          {exercise.maxWeight === exercise.personalBest && (
                            <span className="ml-2 text-green-600">🎉 New Record!</span>
                          )}
                        </p>
                      )}
                    </div>
                    <svg
                      className="w-6 h-6 text-green-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Sets</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {exercise.actualSets}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Reps</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {exercise.actualReps}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Max Weight</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {exercise.maxWeight} lbs
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
