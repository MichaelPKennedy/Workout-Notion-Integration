"use client";

import { useState, useEffect } from "react";
import { WorkoutTemplate } from "@/types/workout";
import { ExerciseCustomizer, CustomizableExercise } from "@/app/components/ExerciseCustomizer";
import { WorkoutEditModal } from "@/app/components/WorkoutEditModal";

interface DayWorkout {
  day: string;
  date: string;
  template: WorkoutTemplate | null;
  completed: boolean;
}

export default function Home() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DayWorkout[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutTemplate | null>(null);
  const [inProgressWorkout, setInProgressWorkout] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [customExercises, setCustomExercises] = useState<CustomizableExercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<
    Array<{ id: string; name: string; bodyGroupName?: string }>
  >([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string>("");

  useEffect(() => {
    fetchTemplates();
    checkInProgressWorkout();
    loadWeeklySchedule().catch((err) =>
      console.error("Error loading weekly schedule:", err)
    );
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setMessage("Error loading templates");
    }
  };

  const checkInProgressWorkout = () => {
    const inProgress = localStorage.getItem("inProgressWorkout");
    if (inProgress) {
      setInProgressWorkout(true);
    }
  };

  const loadWeeklySchedule = async (startDateParam?: string) => {
    try {
      const today = startDateParam ? new Date(startDateParam) : new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);

      const startDateStr = today.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Fetch workouts from the Weekly Workout Plan database
      const workoutsResponse = await fetch(
        `/api/workouts?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const workouts = await workoutsResponse.json();

      // Fetch daily workouts to check completion status
      const dailyResponse = await fetch(
        `/api/daily-workouts?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const dailyWorkouts = await dailyResponse.json();

      // Create a map of daily workouts by date for completion status
      const completionByDate: { [key: string]: boolean } = {};
      dailyWorkouts.forEach(
        (daily: { date: string; completed: boolean }) => {
          if (daily.date) {
            completionByDate[daily.date] = daily.completed;
          }
        }
      );

      // Create a map of workouts by date
      const workoutsByDate: {
        [key: string]: { templateId: string; templateName: string; name: string; exerciseIds: string[] }[];
      } = {};

      workouts.forEach(
        (workout: { date: string; name: string; templateId?: string; exerciseIds: string[] }) => {
          if (workout.date) {
            if (!workoutsByDate[workout.date]) {
              workoutsByDate[workout.date] = [];
            }
            // Extract template name (format: "Template Name - Exercise Name")
            const parts = workout.name.split(" - ");
            const templateName = parts[0] || "Workout";

            workoutsByDate[workout.date].push({
              templateId: workout.templateId || "",
              templateName,
              name: workout.name,
              exerciseIds: workout.exerciseIds || [],
            });
          }
        }
      );

      // Build the weekly schedule
      const schedule: DayWorkout[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateStr = date.toISOString().split("T")[0];

        // Get workouts for this day
        const dayWorkouts = workoutsByDate[dateStr] || [];
        const uniqueTemplates = [...new Set(dayWorkouts.map((w) => w.templateName))];
        const templateName = uniqueTemplates[0] || null;
        let templateId = dayWorkouts[0]?.templateId || "";

        // If templateId is not available, try to find it by matching the template name
        if (!templateId && templateName) {
          const matchingTemplate = templates.find(t => t.name === templateName);
          if (matchingTemplate) {
            templateId = matchingTemplate.id;
          }
        }

        const isCompleted = completionByDate[dateStr] || false;

        schedule.push({
          day: `${dayName} (${dateStr})`,
          date: dateStr,
          template: templateName
            ? ({
                id: templateId,
                name: templateName,
                exercises: dayWorkouts.map(() => ({
                  exerciseId: "",
                  exerciseName: "",
                  defaultSets: 0,
                  defaultReps: 0,
                })),
                bodyGroups: [],
              } as WorkoutTemplate)
            : null,
          completed: isCompleted,
        });

        // Set today's workout if it exists
        if (i === 0 && templateName) {
          setTodayWorkout({
            id: "",
            name: templateName,
            exercises: dayWorkouts.map(() => ({
              exerciseId: "",
              exerciseName: "",
              defaultSets: 0,
              defaultReps: 0,
            })),
            bodyGroups: [],
          });
        }
      }

      setWeeklySchedule(schedule);
    } catch (error) {
      console.error("Error loading weekly schedule:", error);
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
    setCustomExercises([]);

    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        // Initialize with template exercises
        setCustomExercises(
          template.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
          }))
        );
        loadAvailableExercises(templateId);
      }
    }
  };

  const handleCreateWorkout = async () => {
    if (!selectedTemplate) {
      setMessage("Please select a workout template");
      return;
    }

    if (customExercises.length === 0) {
      setMessage("Please add at least one exercise");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          date: selectedDate,
          customExercises,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        // Reset form
        setSelectedTemplate("");
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating workout:", error);
      setMessage("❌ Failed to create workout");
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    const today = new Date().toISOString().split("T")[0];

    // Clear any existing workout progress
    localStorage.removeItem("workoutProgress");
    localStorage.removeItem("inProgressWorkout");

    // Mark this as in-progress
    localStorage.setItem("inProgressWorkout", JSON.stringify({
      date: today,
      startTime: new Date().toISOString(),
    }));

    // Redirect to workout page with today's date
    window.location.href = `/workout/${today}`;
  };

  const handleEditWorkout = (date: string, template: WorkoutTemplate | null) => {
    setEditingDate(date);
    setEditModalOpen(true);
  };

  const handleSaveEditedWorkout = async (
    templateId: string,
    customExercises: CustomizableExercise[],
    deletedExerciseIds?: string[]
  ) => {
    setLoading(true);
    try {
      // First, delete any removed exercises
      if (deletedExerciseIds && deletedExerciseIds.length > 0) {
        for (const exerciseId of deletedExerciseIds) {
          await fetch("/api/workouts/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: editingDate,
              exerciseId,
            }),
          });
        }
      }

      // Only create workout entries for NEW exercises (those without pageId)
      const newExercises = customExercises.filter(ex => !ex.pageId);

      if (newExercises.length > 0) {
        const response = await fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId,
            date: editingDate,
            customExercises: newExercises,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setMessage(`❌ Error: ${data.error}`);
          setLoading(false);
          return;
        }
      }

      setMessage("✅ Workout updated successfully");
      // Reload the weekly schedule
      await loadWeeklySchedule();
    } catch (error) {
      console.error("Error updating workout:", error);
      setMessage("❌ Failed to update workout");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (date: string) => {
    setLoading(true);
    try {
      // Delete all workout entries for this date from Weekly Workout Plan
      const workoutsResponse = await fetch(`/api/workouts?startDate=${date}&endDate=${date}`);
      const workouts = await workoutsResponse.json();

      for (const workout of workouts) {
        await fetch("/api/workouts/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: workout.id }),
        });
      }

      // Delete the daily workout entry
      const dailyResponse = await fetch(`/api/daily-workouts?startDate=${date}&endDate=${date}`);
      const dailyWorkouts = await dailyResponse.json();

      if (dailyWorkouts.length > 0) {
        const dailyWorkoutId = dailyWorkouts[0].id;
        // Archive the daily workout page
        await fetch("/api/workouts/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: dailyWorkoutId }),
        });
      }

      setMessage("✅ Workout deleted successfully");
      setEditModalOpen(false);
      await loadWeeklySchedule();
    } catch (error) {
      console.error("Error deleting workout:", error);
      setMessage("❌ Failed to delete workout");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateWeek = (offset: number) => {
    // Get the first day of the current schedule
    const firstDateStr = weeklySchedule[0]?.date;
    if (!firstDateStr) return;

    const firstDate = new Date(firstDateStr);
    firstDate.setDate(firstDate.getDate() + offset * 7);

    // Reload schedule for the new week
    loadWeeklySchedule(firstDate.toISOString().split("T")[0]);
  };

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-blue-600 text-3xl">🏋️</span>
            Workout Tracker
          </h1>
          <p className="text-gray-600">
            Track your workouts with templates and detailed exercise logging
          </p>
        </div>

        {/* Today&apos;s Workout Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Today&apos;s Workout</h2>
          {todayWorkout ? (
            <div className="space-y-4">
              <div
                className={`bg-gradient-to-r rounded-lg p-6 border-2 ${
                  weeklySchedule[0]?.completed
                    ? "from-green-50 to-emerald-50 border-green-500"
                    : "from-blue-50 to-indigo-50 border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {todayWorkout.name}
                  </h3>
                  {weeklySchedule[0]?.completed && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-semibold text-green-600">Completed</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mb-4">
                  {todayWorkout.exercises.length} exercises planned
                </p>
                {!weeklySchedule[0]?.completed && (
                  <button
                    onClick={handleStartWorkout}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                      inProgressWorkout
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {inProgressWorkout ? "Resume Workout" : "Start Workout"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-4">No workout scheduled for today</p>
              <p className="text-sm text-gray-500">
                Create a workout using the template selector below
              </p>
            </div>
          )}
        </div>

        {/* Weekly Calendar */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleNavigateWeek(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
              title="Previous week"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 flex-1 text-center">
              Weekly Schedule
            </h2>

            <button
              onClick={() => handleNavigateWeek(1)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
              title="Next week"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation Buttons */}
          <div className="flex justify-between mb-4 md:hidden gap-2">
            <button
              onClick={() => handleNavigateWeek(-1)}
              className="flex-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors font-medium"
            >
              ← Prev
            </button>
            <button
              onClick={() => handleNavigateWeek(1)}
              className="flex-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors font-medium"
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weeklySchedule.map((dayWorkout, index) => (
              <div
                key={index}
                onClick={() => handleEditWorkout(dayWorkout.date, dayWorkout.template)}
                className={`rounded-lg p-4 text-center border-2 relative transition-all cursor-pointer hover:shadow-lg ${
                  dayWorkout.completed
                    ? "border-green-500 bg-green-50"
                    : index === 0
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 flex-1">
                    {dayWorkout.day.split(" ")[0]}
                  </p>
                  {dayWorkout.completed && (
                    <svg
                      className="w-4 h-4 text-green-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {dayWorkout.day.split(" ")[1]}
                </p>
                {dayWorkout.template ? (
                  <div>
                    <p
                      className={`text-sm font-medium mb-2 ${
                        dayWorkout.completed
                          ? "text-green-800"
                          : "text-gray-800"
                      }`}
                    >
                      {dayWorkout.template.name}
                    </p>
                    <p
                      className={`text-xs ${
                        dayWorkout.completed
                          ? "text-green-700"
                          : "text-gray-600"
                      }`}
                    >
                      {dayWorkout.template.exercises.length} exercises
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No workout</p>
                )}
              </div>
            ))}
          </div>
        </div>


        {/* Link to Notion */}
        <div className="text-center">
          <a
            href="https://www.notion.so/656e7dd8cd8e41bca72f0c28069eb9f4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Open Weekly Workout Plan in Notion →
          </a>
        </div>
      </div>

      {/* Workout Edit Modal */}
      <WorkoutEditModal
        isOpen={editModalOpen}
        date={editingDate}
        currentTemplate={weeklySchedule.find((d) => d.date === editingDate)?.template || null}
        templates={templates}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEditedWorkout}
        onDelete={handleDeleteWorkout}
      />
    </main>
  );
}
