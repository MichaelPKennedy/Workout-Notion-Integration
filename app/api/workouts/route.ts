import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { getTemplateById } from "@/lib/templates-storage";

export async function POST(request: Request) {
  try {
    const { templateId, date } = await request.json();

    if (!templateId || !date) {
      return NextResponse.json(
        { error: "Template ID and date are required" },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const EXERCISES_DB = process.env.NOTION_EXERCISES_DB!;
    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;

    // Fetch all exercises to get their IDs
    const exercisesResponse = await notion.databases.query({
      database_id: EXERCISES_DB,
    });

    const exerciseMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exercisesResponse.results.map((page: any) => [
        page.properties.Name?.title?.[0]?.plain_text || "",
        page.id,
      ])
    );

    // Create a workout entry for each exercise in the template
    const createdWorkouts = [];
    for (const exercise of template.exercises) {
      const exerciseId = exerciseMap.get(exercise.exerciseName);

      if (!exerciseId) {
        console.warn(`Exercise not found: ${exercise.exerciseName}`);
        continue;
      }

      const workoutEntry = await notion.pages.create({
        parent: { database_id: WEEKLY_WORKOUT_DB },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `${template.name} - ${exercise.exerciseName}`,
                },
              },
            ],
          },
          Date: {
            date: { start: date },
          },
          Exercises: {
            relation: [{ id: exerciseId }],
          },
          "Total Sets": {
            number: exercise.defaultSets,
          },
          "Total Reps": {
            number: exercise.defaultReps,
          },
          "Max Weight": {
            number: 0,
          },
        },
      });

      createdWorkouts.push({
        id: workoutEntry.id,
        name: exercise.exerciseName,
        sets: exercise.defaultSets,
        reps: exercise.defaultReps,
        maxWeight: 0,
      });
    }

    return NextResponse.json({
      success: true,
      workouts: createdWorkouts,
      message: `Created ${createdWorkouts.length} workout entries for ${template.name}`,
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
