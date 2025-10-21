import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { fromDate, toDate } = await request.json();

    console.log("Move workout request:", { fromDate, toDate });

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Both fromDate and toDate are required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;
    const DAILY_WORKOUTS_DB = process.env.NOTION_DAILY_WORKOUTS_DB!;

    // Query Weekly Workout Plan database directly for workouts on fromDate
    const workoutsResponse = await notion.databases.query({
      database_id: WEEKLY_WORKOUT_DB,
      filter: {
        property: "Date",
        date: {
          equals: fromDate,
        },
      },
    });

    console.log(`Found ${workoutsResponse.results.length} workout entries to move`);

    // Update date for each workout entry in Weekly Workout Plan
    for (const workout of workoutsResponse.results) {
      await notion.pages.update({
        page_id: workout.id,
        properties: {
          Date: {
            date: { start: toDate },
          },
        },
      });
    }

    // Query Daily Workouts database for the fromDate entry
    const dailyResponse = await notion.databases.query({
      database_id: DAILY_WORKOUTS_DB,
      filter: {
        property: "Date",
        date: {
          equals: fromDate,
        },
      },
    });

    console.log(`Found ${dailyResponse.results.length} daily workout entries to move`);

    if (dailyResponse.results.length > 0) {
      // Update the existing daily workout entry
      const dailyWorkoutId = dailyResponse.results[0].id;
      await notion.pages.update({
        page_id: dailyWorkoutId,
        properties: {
          Date: {
            date: { start: toDate },
          },
        },
      });
    }

    console.log("Move completed successfully");

    return NextResponse.json({
      success: true,
      message: `Moved workout from ${fromDate} to ${toDate}`,
      movedWorkouts: workoutsResponse.results.length,
    });
  } catch (error) {
    console.error("Error moving workout:", error);
    return NextResponse.json(
      { error: "Failed to move workout" },
      { status: 500 }
    );
  }
}
