"use client";

import { useState, useEffect } from "react";
import { WorkoutTemplate } from "@/types/workout";

export default function Home() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setMessage("Error loading templates");
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

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-blue-600 text-3xl">🏋️</span>
            Workout Tracker
          </h1>
          <p className="text-gray-600 mb-8">
            Select a workout template and create your workout plan with
            pre-filled exercises
          </p>

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

          {/* Instructions */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Choose the date for your workout</li>
              <li>
                Select a workout template (e.g., &quot;Chest &amp;
                Triceps&quot;)
              </li>
              <li>Click &quot;Create Workout in Notion&quot;</li>
              <li>
                The app will automatically create individual entries in your
                Notion &quot;Weekly Workout Plan&quot; database for each
                exercise with default sets and reps
              </li>
              <li>
                Open Notion to update the actual reps, sets, and max weight you
                achieved!
              </li>
            </ol>
          </div>

          {/* Link to Notion */}
          <div className="mt-6 text-center">
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
      </div>
    </main>
  );
}
