import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { templateId, date } = await request.json();

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
    // const TEMPLATES_DB = process.env.NOTION_TEMPLATES_DB!; // not used

    // Fetch the template name
    const templatePage = await notion.pages.retrieve({ page_id: templateId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateName =
      (templatePage as any).properties.Name?.title?.[0]?.plain_text ||
      "Workout";

    // Fetch template exercises for this template
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

    // Create a workout entry for each exercise in the template
    const createdWorkouts = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const page of templateExercisesResponse.results as any[]) {
      const exerciseId = page.properties.Exercise?.relation?.[0]?.id;
      const exerciseName = page.properties.Name?.title?.[0]?.plain_text || "";
      const defaultSets = page.properties["Default Sets"]?.number || 0;
      const defaultReps = page.properties["Default Reps"]?.number || 0;

      if (!exerciseId) {
        console.warn(`Exercise not found: ${exerciseName}`);
        continue;
      }

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
