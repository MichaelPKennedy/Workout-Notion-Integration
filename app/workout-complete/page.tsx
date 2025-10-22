"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkoutCompletePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [personalBests, setPersonalBests] = useState<Array<{ exerciseName: string; weight: number }>>([]);

  useEffect(() => {
    // Load personal bests from localStorage
    const bestsData = localStorage.getItem("personalBestsAchieved");
    if (bestsData) {
      try {
        const bests = JSON.parse(bestsData);
        setPersonalBests(bests);
        // Clear it after reading
        localStorage.removeItem("personalBestsAchieved");
      } catch (error) {
        console.error("Error parsing personal bests:", error);
      }
    }

    const timer = setTimeout(() => {
      setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      router.push("/");
    }
  }, [countdown, router]);

  return (
    <div className="relative min-h-screen bg-gray-50 flex items-center justify-center overflow-hidden">
      {/* Animated confetti particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              fontSize: "1.5rem",
            }}
          >
            🎉
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-8">
        {/* Checkmark */}
        <div className="mb-8 text-7xl text-green-500">✓</div>

        {/* Main message */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">
          Workout Complete
        </h1>

        {/* Subtext */}
        <p className="text-lg text-gray-600 mb-8">
          Great work! Your progress has been saved.
        </p>

        {/* Personal Bests Achieved */}
        {personalBests.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-blue-600 mb-4 flex items-center justify-center gap-2">
              🎉 New Personal Bests!
            </h2>
            <div className="space-y-3">
              {personalBests.map((best, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200"
                >
                  <p className="font-semibold text-gray-800">{best.exerciseName}</p>
                  <p className="text-2xl font-bold text-blue-600">{best.weight} lbs</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Countdown */}
        <p className="text-sm text-gray-500">
          {countdown > 0 && `Returning to home in ${countdown}s`}
        </p>
      </div>

      {/* Floating animation */}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100px) translateX(20px);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float 3s ease-out infinite;
        }
      `}</style>
    </div>
  );
}
