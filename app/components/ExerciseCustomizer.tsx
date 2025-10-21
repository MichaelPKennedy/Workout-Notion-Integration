"use client";

import { useState } from "react";

export interface CustomizableExercise {
  pageId?: string;
  exerciseId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
}

interface ExerciseCustomizerProps {
  exercises: CustomizableExercise[];
  availableExercises: Array<{
    id: string;
    name: string;
    bodyGroupName?: string;
  }>;
  onExercisesChange: (exercises: CustomizableExercise[]) => void;
  onAddClick?: () => void;
  showAddButton?: boolean;
  showExerciseList?: boolean;
}

export function ExerciseCustomizer({
  exercises,
  availableExercises,
  onExercisesChange,
  onAddClick,
  showAddButton = true,
  showExerciseList = true,
}: ExerciseCustomizerProps) {
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(10);

  const filtered = availableExercises.filter((ex) => !exercises.some((e) => e.exerciseId === ex.id));

  const removeExercise = (identifier: string) => {
    // Filter by pageId if it exists, otherwise by exerciseId
    const updated = exercises.filter((ex) =>
      (ex.pageId || ex.exerciseId) !== identifier
    );
    onExercisesChange(updated);
  };

  const addExercise = () => {
    if (!selectedExerciseId) return;

    const exercise = availableExercises.find((ex) => ex.id === selectedExerciseId);
    if (!exercise) return;

    // Check if already in list
    if (exercises.some((ex) => ex.exerciseId === selectedExerciseId)) {
      return;
    }

    const newExercise: CustomizableExercise = {
      exerciseId: selectedExerciseId,
      exerciseName: exercise.name,
      defaultSets: newSets,
      defaultReps: newReps,
    };

    onExercisesChange([...exercises, newExercise]);
    setIsAddingExercise(false);
    setSelectedExerciseId("");
    setNewSets(3);
    setNewReps(10);
  };

  return (
    <div className="space-y-4">
      {/* Exercise List */}
      {showExerciseList && (
        <div className="space-y-2">
          {exercises.map((exercise) => (
            <div
              key={exercise.pageId || exercise.exerciseId}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800">{exercise.exerciseName}</p>
                <p className="text-sm text-gray-600">
                  {exercise.defaultSets} sets × {exercise.defaultReps} reps
                </p>
              </div>
              <button
                onClick={() => removeExercise(exercise.pageId || exercise.exerciseId)}
                className="ml-4 px-3 py-1 text-red-600 hover:text-red-700 font-semibold rounded hover:bg-red-50 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Exercise Section */}
      {showAddButton && (
        <>
          {!isAddingExercise ? (
            <button
              onClick={() => {
                setIsAddingExercise(true);
                onAddClick?.();
              }}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 font-medium transition-colors"
            >
              + Add Exercise
            </button>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Exercise
                </label>
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Choose an exercise...</option>
                  {filtered.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                      {exercise.bodyGroupName && ` (${exercise.bodyGroupName})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sets
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSets}
                    onChange={(e) => setNewSets(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newReps}
                    onChange={(e) => setNewReps(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addExercise}
                  disabled={!selectedExerciseId}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingExercise(false);
                    setSelectedExerciseId("");
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
