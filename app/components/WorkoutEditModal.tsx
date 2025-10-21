"use client";

import { useState, useEffect } from "react";
import { ExerciseCustomizer, CustomizableExercise } from "./ExerciseCustomizer";
import { WorkoutTemplate } from "@/types/workout";

interface AvailableExercise {
  id: string;
  name: string;
  bodyGroupName?: string;
}

interface Workout {
  id: string;
  name: string;
  exerciseIds: string[];
}

interface WorkoutEditModalProps {
  isOpen: boolean;
  date: string;
  currentTemplate: WorkoutTemplate | null;
  templates: WorkoutTemplate[];
  onClose: () => void;
  onSave: (templateId: string, customExercises: CustomizableExercise[], deletedExerciseIds?: string[]) => Promise<void>;
}

export function WorkoutEditModal({
  isOpen,
  date,
  currentTemplate,
  templates,
  onClose,
  onSave,
}: WorkoutEditModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customExercises, setCustomExercises] = useState<CustomizableExercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<AvailableExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([]);
  const [originalExercises, setOriginalExercises] = useState<CustomizableExercise[]>([]);
  const isCreateMode = !currentTemplate;

  useEffect(() => {
    if (isOpen && date) {
      if (currentTemplate) {
        setSelectedTemplate(currentTemplate.id);
        setDeletedExerciseIds([]);
        setDeletedPageIds([]);
        loadWorkoutsForDay(currentTemplate.id);
        loadAvailableExercises(currentTemplate.id);
      } else {
        // Reset form for create mode
        setSelectedTemplate("");
        setCustomExercises([]);
        setAvailableExercises([]);
        setDeletedExerciseIds([]);
        setDeletedPageIds([]);
        setOriginalExercises([]);
      }
    }
  }, [currentTemplate, isOpen, date, templates]);

  const loadWorkoutsForDay = async (templateId: string) => {
    try {
      // Fetch workouts for this specific day
      const response = await fetch(`/api/workouts?startDate=${date}&endDate=${date}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workouts: any[] = await response.json();

      // Convert workouts to CustomizableExercise format
      const exercises = workouts.map((workout) => {
        // Extract exercise name (everything after " - ")
        const parts = workout.name.split(" - ");
        const exerciseName = parts.slice(1).join(" - ") || workout.name;
        // Use the first exercise ID from the relation if available
        const exerciseId = workout.exerciseIds?.[0] || "";

        return {
          pageId: workout.id, // Use the workout page ID as unique identifier
          exerciseId,
          exerciseName,
          defaultSets: workout.sets || 0,
          defaultReps: workout.reps || 0,
        };
      });

      setCustomExercises(exercises);
      setOriginalExercises(exercises);
    } catch (error) {
      console.error("Error loading workouts for day:", error);
    }
  };

  const loadAvailableExercises = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);

      if (!template || template.bodyGroups.length === 0) {
        setAvailableExercises([]);
        return;
      }

      const response = await fetch("/api/exercises/by-body-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyGroupIds: template.bodyGroups }),
      });

      const exercises = await response.json();
      setAvailableExercises(exercises);
    } catch (error) {
      console.error("Error loading available exercises:", error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setDeletedExerciseIds([]);
    setDeletedPageIds([]);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const templateExercises = template.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
      }));
      setCustomExercises(templateExercises);
      setOriginalExercises(templateExercises);
      loadAvailableExercises(templateId);
    }
  };

  const handleExercisesChange = (exercises: CustomizableExercise[]) => {
    // Track deleted exercises (only in edit mode)
    if (!isCreateMode) {
      // Track by pageId if available (existing workouts), otherwise by exerciseId (template-based)
      const currentPageIds = new Set(exercises.map((ex) => ex.pageId).filter(Boolean));
      const originalPageIds = new Set(originalExercises.map((ex) => ex.pageId).filter(Boolean));

      // Find deleted workout entries by pageId
      const deletedPages: string[] = [];
      originalPageIds.forEach((pageId) => {
        if (pageId && !currentPageIds.has(pageId)) {
          deletedPages.push(pageId);
        }
      });

      // Also track by exerciseId for exercises without pageId
      const currentExIds = new Set(exercises.map((ex) => ex.exerciseId));
      const originalExIds = new Set(originalExercises.filter(ex => !ex.pageId).map((ex) => ex.exerciseId));

      const deletedExIds: string[] = [];
      originalExIds.forEach((id) => {
        if (!currentExIds.has(id)) {
          deletedExIds.push(id);
        }
      });

      setDeletedPageIds(deletedPages);
      setDeletedExerciseIds(deletedExIds);
    }

    setCustomExercises(exercises);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      // Delete workout entries by pageId first
      for (const pageId of deletedPageIds) {
        await fetch("/api/workouts/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId }),
        });
      }

      // Then call the main save handler (which handles exerciseId deletions and creates/updates)
      await onSave(selectedTemplate, customExercises, deletedExerciseIds);
      onClose();
    } catch (error) {
      console.error("Error saving workout:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isCreateMode ? "Create Workout" : "Edit Workout"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-size-large"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Workout Template
            </label>
            <select
              key={`template-select-${selectedTemplate}`}
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {isCreateMode && <option value="">Choose a template...</option>}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exercise Customization */}
          {selectedTemplate && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Exercises
              </label>
              <ExerciseCustomizer
                exercises={customExercises}
                availableExercises={availableExercises}
                onExercisesChange={handleExercisesChange}
                showAddButton={true}
                showExerciseList={true}
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold rounded-lg transition-colors disabled:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedTemplate}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
                Saving...
              </>
            ) : (
              isCreateMode ? "Create Workout" : "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
