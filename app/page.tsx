"use client";

import { useState, useEffect } from "react";
import { WorkoutTemplate } from "@/types/workout";

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

  const loadWeeklySchedule = async () => {
    try {
      const today = new Date();
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
        [key: string]: { templateName: string; name: string }[];
      } = {};

      workouts.forEach(
        (workout: { date: string; name: string }) => {
          if (workout.date) {
            if (!workoutsByDate[workout.date]) {
              workoutsByDate[workout.date] = [];
            }
            // Extract template name (format: "Template Name - Exercise Name")
            const parts = workout.name.split(" - ");
            const templateName = parts[0] || "Workout";
            workoutsByDate[workout.date].push({
              templateName,
              name: workout.name,
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
        const isCompleted = completionByDate[dateStr] || false;

        schedule.push({
          day: `${dayName} (${dateStr})`,
          date: dateStr,
          template: templateName
            ? ({
                id: "",
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

  const handleCreateWorkout = async () => {
    if (!selectedTemplate) {
      setMessage("Please select a workout template");
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weeklySchedule.map((dayWorkout, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 text-center border-2 relative ${
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

        {/* Create New Workout Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Workout</h2>

          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Workout Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Workout Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Preview */}
            {selectedTemplateData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Template Preview: {selectedTemplateData.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  The following exercises will be added with default values:
                </p>
                <div className="space-y-2">
                  {selectedTemplateData.exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-800">
                        {exercise.exerciseName}
                      </span>
                      <div className="text-sm text-gray-600">
                        {exercise.defaultSets} sets × {exercise.defaultReps}{" "}
                        reps
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateWorkout}
              disabled={loading || !selectedTemplate}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
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
                  <span>Creating Workout...</span>
                </>
              ) : (
                <span>Create Workout in Notion</span>
              )}
            </button>

            {/* Message Display */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.includes("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}
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
    </main>
  );
}
