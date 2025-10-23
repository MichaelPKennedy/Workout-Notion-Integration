"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ExerciseCustomizer,
  CustomizableExercise,
} from "@/app/components/ExerciseCustomizer";

interface AvailableExercise {
  id: string;
  name: string;
  bodyGroupName?: string;
  best?: number;
}

interface WorkoutEntry {
  id: string;
  name: string;
  date: string;
  sets: number;
  reps: number;
  maxWeight: number;
  completed: boolean;
  templateId?: string;
  exerciseIds: string[];
}

interface ExerciseProgress {
  pageId: string;
  exerciseId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  actualSets: number | null;
  actualReps: number | null;
  maxWeight: number | null;
  completed: boolean;
  personalBest: number;
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.templateId as string; // This is actually the date (YYYY-MM-DD)

  const [workoutName, setWorkoutName] = useState<string>("");
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [availableExercises, setAvailableExercises] = useState<
    AvailableExercise[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [templateId_, setTemplateId] = useState<string>("");
  const [personalBestsAchieved, setPersonalBestsAchieved] = useState<
    Array<{ exerciseName: string; weight: number }>
  >([]);

  useEffect(() => {
    loadWorkoutExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const loadAvailableExercises = async (templateIdValue: string) => {
    try {
      // Fetch the body groups for this template
      const bodyGroupsResponse = await fetch(
        `/api/templates/body-groups?templateId=${templateIdValue}`
      );
      const { bodyGroupIds } = await bodyGroupsResponse.json();

      if (bodyGroupIds.length === 0) {
        setAvailableExercises([]);
        return;
      }

      // Fetch exercises for these body groups
      const exercisesResponse = await fetch("/api/exercises/by-body-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bodyGroupIds }),
      });

      const availableExercises = await exercisesResponse.json();
      setAvailableExercises(availableExercises);
    } catch (error) {
      console.error("Error loading available exercises:", error);
    }
  };

  const loadWorkoutExercises = async () => {
    try {
      // Fetch all workouts for the given date
      const response = await fetch(
        `/api/workouts?startDate=${date}&endDate=${date}`
      );
      const workouts: WorkoutEntry[] = await response.json();

      if (workouts.length === 0) {
        setMessage("No exercises found for this date");
        setLoading(false);
        return;
      }

      // Extract the template name from the first workout (format: "Template Name - Exercise Name")
      const firstWorkout = workouts[0];
      const templateName = firstWorkout.name.split(" - ")[0] || "Workout";
      setWorkoutName(templateName);

      // Extract template ID from the first workout's template relation
      const templateId = firstWorkout.templateId;
      if (templateId) {
        setTemplateId(templateId);
        await loadAvailableExercises(templateId);
      }

      // Fetch personal bests for all exercises
      const exerciseIds = workouts.map((w) => w.exerciseIds[0]).filter(Boolean);
      let exerciseBests: { [key: string]: number } = {};

      if (exerciseIds.length > 0) {
        try {
          const bestsResponse = await fetch("/api/exercises/best", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exerciseIds }),
          });
          if (bestsResponse.ok) {
            exerciseBests = await bestsResponse.json();
          }
        } catch (error) {
          console.error("Failed to fetch personal bests:", error);
        }
      }

      // Initialize exercises from the fetched workouts
      const initialExercises = workouts.map((workout) => {
        // Extract exercise name (everything after " - ")
        const parts = workout.name.split(" - ");
        const exerciseName = parts.slice(1).join(" - ") || workout.name;
        const exerciseId = workout.exerciseIds[0] || "";

        return {
          pageId: workout.id,
          exerciseId,
          exerciseName,
          defaultSets: workout.sets,
          defaultReps: workout.reps,
          actualSets: workout.sets > 0 ? workout.sets : null,
          actualReps: workout.reps > 0 ? workout.reps : null,
          maxWeight: workout.maxWeight > 0 ? workout.maxWeight : null,
          completed: workout.completed,
          personalBest: exerciseBests[exerciseId] || 0,
        };
      });

      // Sort exercises: incomplete first, completed last
      const sortedExercises = [...initialExercises].sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
      });

      setExercises(sortedExercises);

      setLoading(false);
    } catch (error) {
      console.error("Error loading workout exercises:", error);
      setMessage("Error loading workout exercises");
      setLoading(false);
    }
  };

  const updateExercise = (
    pageId: string,
    field: "actualSets" | "actualReps" | "maxWeight",
    value: number | null
  ) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.pageId === pageId ? { ...ex, [field]: value } : ex))
    );
  };

  const completeExercise = async (pageId: string) => {
    const exercise = exercises.find((ex) => ex.pageId === pageId);
    if (!exercise) return;

    if (
      exercise.actualSets === null ||
      exercise.actualReps === null ||
      exercise.maxWeight === null
    ) {
      setMessage("Please fill in all fields before marking complete");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Check if this is a new personal best
      const isNewBest = exercise.maxWeight > exercise.personalBest;
      let newBestValue = exercise.personalBest;

      if (isNewBest) {
        newBestValue = exercise.maxWeight;
        // Update personal best in the exercises database
        try {
          await fetch("/api/exercises/update-best", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exerciseId: exercise.exerciseId,
              newBest: exercise.maxWeight,
            }),
          });
          setMessage(`🎉 New personal best: ${exercise.maxWeight} lbs!`);

          // Track this personal best for the completion page
          setPersonalBestsAchieved((prev) => [
            ...prev,
            { exerciseName: exercise.exerciseName, weight: exercise.maxWeight },
          ]);
        } catch (error) {
          console.error("Failed to update personal best:", error);
        }
      }

      // Save to database immediately
      if (pageId.startsWith("new-")) {
        // Create new workout entry
        const response = await fetch("/api/workouts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateId_,
            exerciseId: pageId.replace("new-", ""),
            exerciseName: exercise.exerciseName,
            date,
            totalSets: exercise.actualSets,
            totalReps: exercise.actualReps,
            maxWeight: exercise.maxWeight,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update the pageId with the actual ID from the database
          const updated = exercises.map((ex) =>
            ex.pageId === pageId
              ? {
                  ...ex,
                  pageId: data.workoutId,
                  completed: true,
                  personalBest: newBestValue,
                }
              : ex
          );

          // Move completed to bottom
          const incomplete = updated.filter((ex) => !ex.completed);
          const completedExercises = updated.filter((ex) => ex.completed);
          const reordered = [...incomplete, ...completedExercises];

          setExercises(reordered);
        } else {
          setMessage("Failed to save exercise");
        }
      } else {
        // Update existing workout entry
        const response = await fetch("/api/workouts/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: exercise.pageId,
            totalSets: exercise.actualSets,
            totalReps: exercise.actualReps,
            maxWeight: exercise.maxWeight,
            completed: true,
          }),
        });

        if (response.ok) {
          // Mark as completed
          const updated = exercises.map((ex) =>
            ex.pageId === pageId
              ? { ...ex, completed: true, personalBest: newBestValue }
              : ex
          );

          // Move completed to bottom
          const incomplete = updated.filter((ex) => !ex.completed);
          const completedExercises = updated.filter((ex) => ex.completed);
          const reordered = [...incomplete, ...completedExercises];

          setExercises(reordered);
        } else {
          setMessage("Failed to save exercise");
        }
      }
    } catch (error) {
      console.error("Error completing exercise:", error);
      setMessage("Error saving exercise");
    } finally {
      setSaving(false);
    }
  };

  const handleExercisesChange = async (
    customizableExercises: CustomizableExercise[]
  ) => {
    // Find deleted exercises
    const currentPageIds = new Set(
      customizableExercises.map((ex) => ex.pageId || `new-${ex.exerciseId}`)
    );
    const deletedExercises = exercises.filter(
      (ex) => !currentPageIds.has(ex.pageId)
    );

    // Delete from database
    for (const exercise of deletedExercises) {
      if (!exercise.pageId.startsWith("new-")) {
        try {
          await fetch("/api/workouts/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date,
              pageId: exercise.pageId,
            }),
          });
        } catch (error) {
          console.error("Error deleting exercise:", error);
        }
      }
    }

    // Find newly added exercises
    const existingPageIds = new Set(exercises.map((ex) => ex.pageId));
    const newExercises = customizableExercises.filter(
      (ex) => !ex.pageId || !existingPageIds.has(ex.pageId)
    );

    // Create new exercises in database immediately
    const exerciseIdMap = new Map<string, string>(); // Maps temp IDs to real page IDs

    for (const newEx of newExercises) {
      const tempId = `new-${newEx.exerciseId}`;
      try {
        const response = await fetch("/api/workouts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateId_,
            exerciseId: newEx.exerciseId,
            exerciseName: newEx.exerciseName,
            date,
            totalSets: newEx.defaultSets,
            totalReps: newEx.defaultReps,
            maxWeight: 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          exerciseIdMap.set(tempId, data.workoutId);
        } else {
          console.error(`Failed to create exercise: ${newEx.exerciseName}`);
        }
      } catch (error) {
        console.error("Error creating exercise:", error);
      }
    }

    // Convert CustomizableExercise to ExerciseProgress
    const updatedExercises = customizableExercises.map((ex) => {
      // Find existing exercise
      const existing = exercises.find(
        (e) => e.pageId === ex.pageId || e.pageId === `new-${ex.exerciseId}`
      );

      // Get the real page ID if this was a newly created exercise
      const tempId = `new-${ex.exerciseId}`;
      const realPageId = exerciseIdMap.get(tempId) || ex.pageId || tempId;

      // Get personal best from availableExercises or existing exercise
      const availableExercise = availableExercises.find(
        (ae) => ae.id === ex.exerciseId
      );
      const personalBest =
        existing?.personalBest ?? availableExercise?.best ?? 0;

      return {
        pageId: realPageId,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        actualSets: existing?.actualSets ?? null,
        actualReps: existing?.actualReps ?? null,
        maxWeight: existing?.maxWeight ?? null,
        completed: existing?.completed ?? false,
        personalBest,
      };
    });

    setExercises(updatedExercises);
  };

  const handleFinishWorkout = async () => {
    setSaving(true);
    setMessage("");

    try {
      // All exercise data is already saved to the database in real-time
      // We just need to mark the daily workout as completed
      const dailyUpdateResponse = await fetch("/api/daily-workouts/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          completed: true,
        }),
      });

      if (!dailyUpdateResponse.ok) {
        console.error("Failed to mark daily workout as completed");
      }

      // Clear in-progress workout flag
      localStorage.removeItem("inProgressWorkout");

      // Save personal bests achieved for the completion page
      if (personalBestsAchieved.length > 0) {
        localStorage.setItem(
          "personalBestsAchieved",
          JSON.stringify(personalBestsAchieved)
        );
      }

      setMessage("Workout finished!");
      setTimeout(() => {
        router.push("/workout-complete");
      }, 500);
    } catch (error) {
      console.error("Error finishing workout:", error);
      setMessage("Error saving workout to Notion");
    } finally {
      setSaving(false);
    }
  };

  const handleBackHome = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (!workoutName || exercises.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No workout found for this date</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const completedCount = exercises.filter((ex) => ex.completed).length;
  const totalCount = exercises.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">{workoutName}</h1>
            <button
              onClick={handleBackHome}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            ></div>
          </div>
          <p className="text-gray-600 mt-2 text-sm">
            {completedCount} of {totalCount} exercises completed
          </p>
        </div>

        {/* Exercises List */}
        <div className="space-y-4 mb-8">
          {exercises.map((exercise) => (
            <div
              key={exercise.pageId}
              className={`rounded-xl p-6 transition-all duration-300 relative ${
                exercise.completed
                  ? "bg-green-50 border-2 border-green-500"
                  : "bg-white border-2 border-gray-200"
              }`}
            >
              {/* Remove Button */}
              <button
                onClick={async () => {
                  // Delete from database if it's an existing exercise
                  if (!exercise.pageId.startsWith("new-")) {
                    try {
                      await fetch("/api/workouts/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          date,
                          pageId: exercise.pageId,
                        }),
                      });
                    } catch (error) {
                      console.error("Error deleting exercise:", error);
                    }
                  }
                  const updated = exercises.filter(
                    (ex) => ex.pageId !== exercise.pageId
                  );
                  setExercises(updated);
                }}
                className="absolute top-4 right-4 text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                title="Remove exercise"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="mb-4 pr-8">
                <h3
                  className={`text-lg font-semibold ${
                    exercise.completed ? "text-green-700" : "text-gray-800"
                  }`}
                >
                  {exercise.exerciseName}
                </h3>
                {exercise.personalBest > 0 && (
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    Personal Best: {exercise.personalBest} lbs
                  </p>
                )}
                {exercise.completed && (
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-green-600 font-semibold">
                      Completed
                    </span>
                  </div>
                )}
              </div>

              {!exercise.completed ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Sets
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={exercise.actualSets ?? ""}
                        onChange={(e) =>
                          updateExercise(
                            exercise.pageId,
                            "actualSets",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder={`Default: ${exercise.defaultSets}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Reps
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={exercise.actualReps ?? ""}
                        onChange={(e) =>
                          updateExercise(
                            exercise.pageId,
                            "actualReps",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder={`Default: ${exercise.defaultReps}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Weight (lbs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={exercise.maxWeight ?? ""}
                        onChange={(e) =>
                          updateExercise(
                            exercise.pageId,
                            "maxWeight",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => completeExercise(exercise.pageId)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Sets</p>
                    <p className="text-lg font-semibold text-green-700">
                      {exercise.actualSets}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Reps</p>
                    <p className="text-lg font-semibold text-green-700">
                      {exercise.actualReps}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Max Weight</p>
                    <p className="text-lg font-semibold text-green-700">
                      {exercise.maxWeight} lbs
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Exercise Button */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <ExerciseCustomizer
            exercises={exercises.map((ex) => ({
              pageId: ex.pageId,
              exerciseId: ex.pageId.startsWith("new-")
                ? ex.pageId.replace("new-", "")
                : ex.pageId,
              exerciseName: ex.exerciseName,
              defaultSets: ex.defaultSets,
              defaultReps: ex.defaultReps,
            }))}
            availableExercises={availableExercises}
            onExercisesChange={handleExercisesChange}
            showAddButton={true}
            showExerciseList={false}
          />
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 rounded-lg mb-8 ${
              message.includes("Error")
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Finish Button */}
        {completedCount === totalCount && completedCount > 0 && (
          <button
            onClick={handleFinishWorkout}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
                <span>Saving...</span>
              </>
            ) : (
              <span>Finish Workout</span>
            )}
          </button>
        )}

        {completedCount < totalCount && (
          <p className="text-center text-gray-600 text-sm mt-4">
            Complete all exercises to finish your workout
          </p>
        )}
      </div>
    </main>
  );
}
