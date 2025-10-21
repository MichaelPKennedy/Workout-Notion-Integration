"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkoutCompletePage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
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
