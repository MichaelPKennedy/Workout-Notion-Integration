"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface WorkoutEntry {
  id: string;
  name: string;
  date: string;
  sets: number;
  reps: number;
  maxWeight: number;
}

interface ExerciseProgress {
  pageId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  actualSets: number | null;
  actualReps: number | null;
  maxWeight: number | null;
  completed: boolean;
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.templateId as string; // This is actually the date (YYYY-MM-DD)

  const [workoutName, setWorkoutName] = useState<string>("");
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      await loadWorkoutExercises();
      loadWorkoutProgress();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

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

      // Initialize exercises from the fetched workouts
      const initialExercises = workouts.map((workout) => {
        // Extract exercise name (everything after " - ")
        const parts = workout.name.split(" - ");
        const exerciseName = parts.slice(1).join(" - ") || workout.name;

        return {
          pageId: workout.id,
          exerciseName,
          defaultSets: workout.sets,
          defaultReps: workout.reps,
          actualSets: null,
          actualReps: null,
          maxWeight: null,
          completed: false,
        };
      });

      // Load saved progress if exists
      const savedProgress = localStorage.getItem("workoutProgress");
      if (savedProgress) {
        try {
          setExercises(JSON.parse(savedProgress));
        } catch {
          setExercises(initialExercises);
        }
      } else {
        setExercises(initialExercises);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading workout exercises:", error);
      setMessage("Error loading workout exercises");
      setLoading(false);
    }
  };

  const loadWorkoutProgress = () => {
    const savedProgress = localStorage.getItem("workoutProgress");
    if (savedProgress) {
      try {
        setExercises(JSON.parse(savedProgress));
      } catch (e) {
        console.error("Error loading progress:", e);
      }
    }
  };

  const updateExercise = (
    pageId: string,
    field: "actualSets" | "actualReps" | "maxWeight",
    value: number | null
  ) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.pageId === pageId ? { ...ex, [field]: value } : ex
      )
    );
  };

  const completeExercise = (pageId: string) => {
    const exercise = exercises.find((ex) => ex.pageId === pageId);
    if (!exercise) return;

    if (exercise.actualSets === null || exercise.actualReps === null || exercise.maxWeight === null) {
      setMessage("Please fill in all fields before marking complete");
      return;
    }

    // Mark as completed
    const updated = exercises.map((ex) =>
      ex.pageId === pageId ? { ...ex, completed: true } : ex
    );

    // Move completed to bottom
    const incomplete = updated.filter((ex) => !ex.completed);
    const completed = updated.filter((ex) => ex.completed);
    const reordered = [...incomplete, ...completed];

    setExercises(reordered);
    saveProgress(reordered);
    setMessage("");
  };

  const saveProgress = (data: ExerciseProgress[]) => {
    localStorage.setItem("workoutProgress", JSON.stringify(data));
  };


  const handleFinishWorkout = async () => {
    setSaving(true);
    setMessage("");

    try {
      // Save each completed exercise to Notion using their page IDs
      for (const exercise of exercises.filter((ex) => ex.completed)) {
        const response = await fetch("/api/workouts/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageId: exercise.pageId,
            totalSets: exercise.actualSets,
            totalReps: exercise.actualReps,
            maxWeight: exercise.maxWeight,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to save ${exercise.exerciseName}`);
        }
      }

      // Mark the daily workout as completed
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

      // Clear local storage
      localStorage.removeItem("workoutProgress");
      localStorage.removeItem("inProgressWorkout");

      setMessage("Workout finished! Progress saved to Notion.");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Error finishing workout:", error);
      setMessage("Error saving workout to Notion");
    } finally {
      setSaving(false);
    }
  };

  const handleBackHome = () => {
    // Save progress before leaving
    saveProgress(exercises);
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
              className={`rounded-xl p-6 transition-all duration-300 ${
                exercise.completed
                  ? "bg-green-50 border-2 border-green-500"
                  : "bg-white border-2 border-gray-200"
              }`}
            >
              <div className="mb-4">
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    exercise.completed ? "text-green-700" : "text-gray-800"
                  }`}
                >
                  {exercise.exerciseName}
                </h3>
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
                    <span className="text-green-600 font-semibold">Completed</span>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
