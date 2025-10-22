import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { templateId, date, customExercises } = await request.json();

    if (!templateId || !date) {
      return NextResponse.json(
        { error: "Template ID and date are required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const TEMPLATE_EXERCISES_DB = process.env.NOTION_TEMPLATE_EXERCISES_DB!;
    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;
    const DAILY_WORKOUTS_DB = process.env.NOTION_DAILY_WORKOUTS_DB!;

    // Fetch the template name
    const templatePage = await notion.pages.retrieve({ page_id: templateId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateName =
      (templatePage as any).properties.Name?.title?.[0]?.plain_text ||
      "Workout";

    // Check if a daily workout entry already exists for this date
    const existingDailyWorkout = await notion.databases.query({
      database_id: DAILY_WORKOUTS_DB,
      filter: {
        property: "Date",
        date: {
          equals: date,
        },
      },
    });

    // Create a daily workout entry if it doesn't exist
    let dailyWorkoutId = null;
    if (existingDailyWorkout.results.length === 0) {
      const dailyWorkoutEntry = await notion.pages.create({
        parent: { database_id: DAILY_WORKOUTS_DB },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: templateName,
                },
              },
            ],
          },
          Date: {
            date: { start: date },
          },
          Completed: {
            checkbox: false,
          },
        },
      });
      dailyWorkoutId = dailyWorkoutEntry.id;
    } else {
      dailyWorkoutId = existingDailyWorkout.results[0].id;
    }

    // Use custom exercises if provided, otherwise fetch from template
    let exercisesToCreate: Array<{
      exerciseId: string;
      exerciseName: string;
      defaultSets: number;
      defaultReps: number;
    }> = [];

    if (customExercises && customExercises.length > 0) {
      // Use the custom exercises from the request
      exercisesToCreate = customExercises;
    } else {
      // Fallback to template exercises
      const templateExercisesResponse = await notion.databases.query({
        database_id: TEMPLATE_EXERCISES_DB,
        filter: {
          property: "Template",
          relation: {
            contains: templateId,
          },
        },
        sorts: [
          {
            property: "Order",
            direction: "ascending",
          },
        ],
      });

      exercisesToCreate = (templateExercisesResponse.results as any[])
        .map((page) => {
          const exerciseId = page.properties.Exercise?.relation?.[0]?.id;
          const fullName = page.properties.Name?.title?.[0]?.plain_text || "";
          const defaultSets = page.properties["Default Sets"]?.number || 0;
          const defaultReps = page.properties["Default Reps"]?.number || 0;

          if (!exerciseId) return null;

          const parts = fullName.split(" - ");
          const exerciseName =
            parts.length > 1 ? parts[parts.length - 1] : fullName;

          return { exerciseId, exerciseName, defaultSets, defaultReps };
        })
        .filter((ex) => ex !== null);
    }

    // Create a workout entry for each exercise
    const createdWorkouts = [];
    for (const { exerciseId, exerciseName, defaultSets, defaultReps } of exercisesToCreate) {
      const workoutEntry = await notion.pages.create({
        parent: { database_id: WEEKLY_WORKOUT_DB },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `${templateName} - ${exerciseName}`,
                },
              },
            ],
          },
          Date: {
            date: { start: date },
          },
          "Workout Template": {
            relation: [{ id: templateId }],
          },
          Exercises: {
            relation: [{ id: exerciseId }],
          },
          "Total Sets": {
            number: defaultSets,
          },
          "Total Reps": {
            number: defaultReps,
          },
          "Max Weight": {
            number: 0,
          },
        },
      });

      createdWorkouts.push({
        id: workoutEntry.id,
        name: exerciseName,
        sets: defaultSets,
        reps: defaultReps,
        maxWeight: 0,
      });
    }

    return NextResponse.json({
      success: true,
      workouts: createdWorkouts,
      dailyWorkoutId,
      message: `Created ${createdWorkouts.length} workout entries for ${templateName}`,
    });
  } catch (error) {
    console.error("Error creating workout from template:", error);
    return NextResponse.json(
      { error: "Failed to create workout from template" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (startDate && endDate) {
      filter.and = [
        {
          property: "Date",
          date: {
            on_or_after: startDate,
          },
        },
        {
          property: "Date",
          date: {
            on_or_before: endDate,
          },
        },
      ];
    }

    const response = await notion.databases.query({
      database_id: WEEKLY_WORKOUT_DB,
      ...(Object.keys(filter).length > 0 && { filter }),
      sorts: [
        {
          property: "Date",
          direction: "descending",
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workouts = response.results.map((page: any) => ({
      id: page.id,
      name: page.properties.Name?.title?.[0]?.plain_text || "",
      date: page.properties.Date?.date?.start || "",
      sets: page.properties["Total Sets"]?.number || 0,
      reps: page.properties["Total Reps"]?.number || 0,
      maxWeight: page.properties["Max Weight"]?.number || 0,
      completed: page.properties.Completed?.checkbox || false,
      templateId:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        page.properties["Workout Template"]?.relation?.[0]?.id || undefined,
      exerciseIds:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        page.properties.Exercises?.relation?.map((rel: any) => rel.id) || [],
    }));

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}
