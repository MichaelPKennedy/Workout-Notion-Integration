import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { DateTime } from "luxon";

export async function POST(request: Request) {
  try {
    const { fromDate, toDate, isSwap } = await request.json();

    console.log("Move workout request:", { fromDate, toDate, isSwap });

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

    // Helper function to get estimated time for a template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getEstimatedTime = async (templateId: string): Promise<number> => {
      try {
        const templatePage = await notion.pages.retrieve({ page_id: templateId });
        const templatePageAny = templatePage as any;
        return templatePageAny.properties["Estimated Time"]?.number || 0;
      } catch (error) {
        console.error("Error getting estimated time:", error);
        return 0;
      }
    };

    // Helper function to calculate time range for Daily Workouts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateDailyWorkoutDate = async (date: string, templateId?: string): Promise<{ start: string; end?: string }> => {
      let estimatedTime = 0;
      if (templateId) {
        estimatedTime = await getEstimatedTime(templateId);
      }

      if (estimatedTime > 0) {
        const startDateTime = DateTime.fromISO(date, { zone: 'UTC' }).set({ hour: 10, minute: 30, second: 0 });
        const endDateTime = startDateTime.plus({ minutes: estimatedTime });
        return {
          start: startDateTime.toISO()!,
          end: endDateTime.toISO()!,
        };
      } else {
        return { start: date };
      }
    };

    if (isSwap) {
      // Get workouts from toDate for swapping
      const toWorkoutsResponse = await notion.databases.query({
        database_id: WEEKLY_WORKOUT_DB,
        filter: {
          property: "Date",
          date: {
            equals: toDate,
          },
        },
      });

      // Swap dates: move fromDate workouts to toDate and toDate workouts to fromDate
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

      for (const workout of toWorkoutsResponse.results) {
        await notion.pages.update({
          page_id: workout.id,
          properties: {
            Date: {
              date: { start: fromDate },
            },
          },
        });
      }

      // Also swap daily workouts
      const fromDailyResponse = await notion.databases.query({
        database_id: DAILY_WORKOUTS_DB,
        filter: {
          property: "Date",
          date: {
            equals: fromDate,
          },
        },
      });

      const toDailyResponse = await notion.databases.query({
        database_id: DAILY_WORKOUTS_DB,
        filter: {
          property: "Date",
          date: {
            equals: toDate,
          },
        },
      });

      if (fromDailyResponse.results.length > 0) {
        // Try to find the template by searching for workouts on this date
        let templateIdToUse: string | undefined;
        for (const workout of toWorkoutsResponse.results) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workoutAny = workout as any;
          templateIdToUse = workoutAny.properties["Workout Template"]?.relation?.[0]?.id;
          if (templateIdToUse) break;
        }

        const dateValue = await calculateDailyWorkoutDate(toDate, templateIdToUse);
        await notion.pages.update({
          page_id: fromDailyResponse.results[0].id,
          properties: {
            Date: {
              date: dateValue,
            },
          },
        });
      }

      if (toDailyResponse.results.length > 0) {
        // Try to find the template by searching for workouts on this date
        let templateIdToUse: string | undefined;
        for (const workout of workoutsResponse.results) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workoutAny = workout as any;
          templateIdToUse = workoutAny.properties["Workout Template"]?.relation?.[0]?.id;
          if (templateIdToUse) break;
        }

        const dateValue = await calculateDailyWorkoutDate(fromDate, templateIdToUse);
        await notion.pages.update({
          page_id: toDailyResponse.results[0].id,
          properties: {
            Date: {
              date: dateValue,
            },
          },
        });
      }
    } else {
      // Regular move: just change fromDate to toDate
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

      if (dailyResponse.results.length > 0) {
        // Try to find the template by searching for workouts on this date
        let templateIdToUse: string | undefined;
        for (const workout of workoutsResponse.results) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const workoutAny = workout as any;
          templateIdToUse = workoutAny.properties["Workout Template"]?.relation?.[0]?.id;
          if (templateIdToUse) break;
        }

        const dateValue = await calculateDailyWorkoutDate(toDate, templateIdToUse);
        await notion.pages.update({
          page_id: dailyResponse.results[0].id,
          properties: {
            Date: {
              date: dateValue,
            },
          },
        });
      }
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
