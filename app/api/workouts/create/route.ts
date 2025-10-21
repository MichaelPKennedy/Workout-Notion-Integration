import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { templateId, exerciseId, exerciseName, date, totalSets, totalReps, maxWeight } =
      await request.json();

    if (!templateId || !exerciseId || !exerciseName || !date) {
      return NextResponse.json(
        { error: "Template ID, exercise ID, exercise name, and date are required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;
    const TEMPLATE_EXERCISES_DB = process.env.NOTION_TEMPLATE_EXERCISES_DB!;

    // Fetch the template to get its name
    const templatePage = await notion.pages.retrieve({ page_id: templateId });
    const templateName = (templatePage as any).properties.Name?.title?.[0]?.plain_text || "Workout";

    // Fetch the template exercise entry to get the proper template exercise relation
    const templateExercisesResponse = await notion.databases.query({
      database_id: TEMPLATE_EXERCISES_DB,
      filter: {
        and: [
          {
            property: "Template",
            relation: {
              contains: templateId,
            },
          },
          {
            property: "Exercise",
            relation: {
              contains: exerciseId,
            },
          },
        ],
      },
    });

    let templateExerciseId = undefined;
    if (templateExercisesResponse.results.length > 0) {
      templateExerciseId = templateExercisesResponse.results[0].id;
    }

    // Create a new workout entry
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
        "Workout Template": {
          relation: [{ id: templateId }],
        },
        ...(templateExerciseId && {
          "Template Exercise": {
            relation: [{ id: templateExerciseId }],
          },
        }),
        "Total Sets": {
          number: totalSets || 0,
        },
        "Total Reps": {
          number: totalReps || 0,
        },
        "Max Weight": {
          number: maxWeight || 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      workoutId: workoutEntry.id,
      message: `Created workout entry for ${exerciseName}`,
    });
  } catch (error) {
    console.error("Error creating workout entry:", error);
    return NextResponse.json(
      { error: "Failed to create workout entry" },
      { status: 500 }
    );
  }
}
