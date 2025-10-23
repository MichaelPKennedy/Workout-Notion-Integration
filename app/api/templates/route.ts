import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  defaultSets: number;
  defaultReps: number;
  order: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  bodyGroups: string[];
  estimatedTime?: number; // in minutes
}

export async function GET() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const TEMPLATES_DB = process.env.NOTION_TEMPLATES_DB!;
    const TEMPLATE_EXERCISES_DB = process.env.NOTION_TEMPLATE_EXERCISES_DB!;
    const EXERCISES_DB = process.env.NOTION_EXERCISES_DB!;

    // Fetch all templates
    const templatesResponse = await notion.databases.query({
      database_id: TEMPLATES_DB,
      sorts: [
        {
          property: "Name",
          direction: "ascending",
        },
      ],
    });

    // Fetch all template exercises
    const templateExercisesResponse = await notion.databases.query({
      database_id: TEMPLATE_EXERCISES_DB,
      sorts: [
        {
          property: "Order",
          direction: "ascending",
        },
      ],
    });

    // Fetch all exercises to get names
    const exercisesResponse = await notion.databases.query({
      database_id: EXERCISES_DB,
    });

    // Create a map of exercise IDs to names
    const exerciseMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exercisesResponse.results.map((page: any) => [
        page.id,
        page.properties.Name?.title?.[0]?.plain_text || "",
      ])
    );

    // Group template exercises by template ID
    const templateExercisesMap = new Map<string, TemplateExercise[]>();

    for (const page of templateExercisesResponse.results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = page as any;
      const templateId = p.properties.Template?.relation?.[0]?.id;
      const exerciseId = p.properties.Exercise?.relation?.[0]?.id;
      const defaultSets = p.properties["Default Sets"]?.number || 0;
      const defaultReps = p.properties["Default Reps"]?.number || 0;
      const order = p.properties.Order?.number || 0;

      if (templateId && exerciseId) {
        if (!templateExercisesMap.has(templateId)) {
          templateExercisesMap.set(templateId, []);
        }

        templateExercisesMap.get(templateId)!.push({
          exerciseId,
          exerciseName: exerciseMap.get(exerciseId) || "",
          defaultSets,
          defaultReps,
          order,
        });
      }
    }

    // Build the final templates array
    const templates: WorkoutTemplate[] = templatesResponse.results.map(
      (page) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = page as any;
        const templateId = p.id as string;
        const exercises = templateExercisesMap.get(templateId) || [];
        const bodyGroups =
          p.properties["Body Groups"]?.relation?.map((rel: any) => rel.id) || [];

        // Sort exercises by order
        exercises.sort((a, b) => a.order - b.order);

        return {
          id: templateId,
          name: String(p.properties.Name?.title?.[0]?.plain_text || ""),
          exercises: exercises.map(
            ({
              exerciseId,
              exerciseName,
              defaultSets,
              defaultReps,
              order,
            }) => ({
              exerciseId,
              exerciseName,
              defaultSets,
              defaultReps,
              order,
            })
          ),
          bodyGroups,
          estimatedTime: p.properties["Estimated Time"]?.number || 0,
        };
      }
    );

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
