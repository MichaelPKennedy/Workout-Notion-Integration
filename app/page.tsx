"use client";

import { useState, useEffect } from "react";
import { WorkoutTemplate } from "@/types/workout";
import { CustomizableExercise } from "@/app/components/ExerciseCustomizer";
import { WorkoutEditModal } from "@/app/components/WorkoutEditModal";
import { ViewCompletedWorkoutModal } from "@/app/components/ViewCompletedWorkoutModal";
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

interface DayWorkout {
  day: string;
  date: string;
  template: WorkoutTemplate | null;
  completed: boolean;
}

interface DayCardProps {
  dayWorkout: DayWorkout;
  index: number;
  onEdit: (date: string) => void;
  isMovingTo?: boolean;
}

function DayCard({ dayWorkout, index, onEdit, isMovingTo }: DayCardProps) {
  const hasWorkout = !!dayWorkout.template;

  // Make it draggable if it has a workout
  const { attributes: dragAttributes, listeners: dragListeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dayWorkout.date,
    disabled: !hasWorkout,
  });

  // Make it droppable if it doesn't have a workout
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dayWorkout.date,
    disabled: hasWorkout,
  });

  // Use the appropriate ref based on whether it's draggable or droppable
  const setNodeRef = hasWorkout ? setDragRef : setDropRef;

  return (
    <div
      ref={setNodeRef}
      {...(hasWorkout ? { ...dragAttributes, ...dragListeners } : {})}
      onClick={() => {
        // Only trigger edit if not dragging
        if (!isDragging) {
          onEdit(dayWorkout.date);
        }
      }}
      className={`rounded-lg p-4 text-center border-2 relative transition-all ${
        hasWorkout ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } hover:shadow-lg ${
        isDragging
          ? "opacity-50 scale-95"
          : isOver
            ? "border-blue-500 bg-blue-100 scale-105"
            : dayWorkout.completed
              ? "border-green-500 bg-green-50"
              : dayWorkout.date === new Date().toISOString().split("T")[0]
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-gray-50"
      }`}
      style={{
        touchAction: hasWorkout ? 'none' : 'auto', // Prevent default touch actions when dragging
      }}
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
      ) : isMovingTo ? (
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
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
      ) : (
        <p className="text-xs text-gray-500">
          {isOver ? "Drop here" : "No workout"}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DayWorkout[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutTemplate | null>(null);
  const [inProgressWorkout, setInProgressWorkout] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string>("");
  const [movingToDate, setMovingToDate] = useState<string | null>(null);
  const [todayWorkoutLoading, setTodayWorkoutLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ fromDate: string; toDate: string; workoutName: string } | null>(null);
  const [viewCompletedModalOpen, setViewCompletedModalOpen] = useState(false);
  const [viewingDate, setViewingDate] = useState<string>("");

  useEffect(() => {
    fetchTemplates();
    checkInProgressWorkout();
    loadTodayWorkout();
    loadWeeklySchedule().catch((err) =>
      console.error("Error loading weekly schedule:", err)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const checkInProgressWorkout = () => {
    const inProgress = localStorage.getItem("inProgressWorkout");
    if (inProgress) {
      setInProgressWorkout(true);
    }
  };

  const loadTodayWorkout = async () => {
    setTodayWorkoutLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // Fetch today's workout
      const workoutsResponse = await fetch(
        `/api/workouts?startDate=${todayStr}&endDate=${todayStr}`
      );
      const workouts = await workoutsResponse.json();

      if (workouts.length > 0) {
        // Extract template name from the first workout
        const parts = workouts[0].name.split(" - ");
        const templateName = parts[0] || "Workout";

        setTodayWorkout({
          id: "",
          name: templateName,
          exercises: workouts.map(() => ({
            exerciseId: "",
            exerciseName: "",
            defaultSets: 0,
            defaultReps: 0,
          })),
          bodyGroups: [],
        });
      } else {
        setTodayWorkout(null);
      }
      setTodayWorkoutLoading(false);
    } catch (error) {
      console.error("Error loading today's workout:", error);
      setTodayWorkout(null);
      setTodayWorkoutLoading(false);
    }
  };

  const loadWeeklySchedule = async (startDateParam?: string) => {
    setScheduleLoading(true);
    try {
      // Calculate the Monday of the week to display
      let weekStart: Date;

      if (startDateParam) {
        // If a date is provided from navigation, use it directly (should already be a Monday)
        weekStart = new Date(startDateParam);
      } else {
        // For initial load, find the Monday of the current week
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const daysFromMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
        weekStart = new Date(now);
        weekStart.setDate(now.getDate() + daysFromMonday);
      }

      const endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + 6); // Sunday

      const startDateStr = weekStart.toISOString().split("T")[0];
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
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
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
      }

      setWeeklySchedule(schedule);
      setScheduleLoading(false);
    } catch (error) {
      console.error("Error loading weekly schedule:", error);
      setScheduleLoading(false);
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

  const handleEditWorkout = (date: string) => {
    // Check if this workout is completed
    const dayWorkout = weeklySchedule.find(d => d.date === date);
    if (dayWorkout?.completed) {
      // Open view completed modal instead
      setViewingDate(date);
      setViewCompletedModalOpen(true);
    } else {
      // Open edit modal
      setEditingDate(date);
      setEditModalOpen(true);
    }
  };

  const handleSaveEditedWorkout = async (
    templateId: string,
    customExercises: CustomizableExercise[],
    deletedExerciseIds?: string[]
  ) => {
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
          console.error("Error updating workout:", data.error);
          return;
        }
      }

      // Reload the weekly schedule
      await loadWeeklySchedule();
    } catch (error) {
      console.error("Error updating workout:", error);
    }
  };

  const handleMoveWorkout = async (fromDate: string, toDate: string) => {
    setMovingToDate(toDate);
    try {
      const response = await fetch("/api/workouts/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      });

      if (response.ok) {
        await loadWeeklySchedule();
      } else {
        const data = await response.json();
        console.error("Error moving workout:", data.error);
      }
    } catch (error) {
      console.error("Error moving workout:", error);
    } finally {
      setMovingToDate(null);
    }
  };

  const handleDeleteWorkout = async (date: string) => {
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

      setEditModalOpen(false);
      await loadWeeklySchedule();
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  const handleNavigateWeek = (offset: number) => {
    // Get the first day of the current schedule (should be Monday)
    const firstDateStr = weeklySchedule[0]?.date;
    if (!firstDateStr) return;

    // Calculate the next/previous Monday
    const firstDate = new Date(firstDateStr);
    firstDate.setDate(firstDate.getDate() + offset * 7);

    // Set loading state immediately to prevent showing stale data
    setScheduleLoading(true);

    // Reload schedule for the new week
    loadWeeklySchedule(firstDate.toISOString().split("T")[0]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const fromDate = active.id as string;
    const toDate = over.id as string;

    // Find the days
    const fromDay = weeklySchedule.find(d => d.date === fromDate);
    const toDay = weeklySchedule.find(d => d.date === toDate);

    // Only allow moving if source has a workout and destination doesn't
    if (fromDay?.template && !toDay?.template) {
      // Show confirmation modal instead of moving immediately
      setPendingMove({
        fromDate,
        toDate,
        workoutName: fromDay.template.name,
      });
      setShowMoveConfirm(true);
    }
  };

  const handleConfirmMove = async () => {
    if (pendingMove) {
      setShowMoveConfirm(false);
      await handleMoveWorkout(pendingMove.fromDate, pendingMove.toDate);
      setPendingMove(null);
    }
  };

  const handleCancelMove = () => {
    setShowMoveConfirm(false);
    setPendingMove(null);
  };

  // Configure sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Allow 8px of movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts on touch
        tolerance: 8,
      },
    })
  );

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
          {todayWorkoutLoading ? (
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
          ) : todayWorkout ? (
            <div className="space-y-4">
              {(() => {
                // Find today's entry in the weekly schedule
                const todayStr = new Date().toISOString().split("T")[0];
                const todayEntry = weeklySchedule.find(day => day.date === todayStr);
                const isTodayCompleted = todayEntry?.completed || false;

                return (
                  <div
                    className={`bg-gradient-to-r rounded-lg p-6 border-2 ${
                      isTodayCompleted
                        ? "from-green-50 to-emerald-50 border-green-500"
                        : "from-blue-50 to-indigo-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {todayWorkout.name}
                      </h3>
                      {isTodayCompleted && (
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
                    {!isTodayCompleted && (
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
                );
              })()}
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

          {scheduleLoading ? (
            <div className="flex items-center justify-center py-16">
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
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weeklySchedule.map((dayWorkout, index) => (
                  <DayCard
                    key={dayWorkout.date}
                    dayWorkout={dayWorkout}
                    index={index}
                    onEdit={handleEditWorkout}
                    isMovingTo={movingToDate === dayWorkout.date}
                  />
                ))}
              </div>
            </DndContext>
          )}
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

      {/* View Completed Workout Modal */}
      <ViewCompletedWorkoutModal
        isOpen={viewCompletedModalOpen}
        date={viewingDate}
        onClose={() => setViewCompletedModalOpen(false)}
      />

      {/* Move Confirmation Modal */}
      {showMoveConfirm && pendingMove && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Move Workout?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to move <span className="font-semibold">{pendingMove.workoutName}</span> from{" "}
              <span className="font-semibold">{new Date(pendingMove.fromDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span> to{" "}
              <span className="font-semibold">{new Date(pendingMove.toDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelMove}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMove}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Move Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
