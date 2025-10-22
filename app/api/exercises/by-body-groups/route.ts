import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { bodyGroupIds } = await request.json();

    if (!bodyGroupIds || !Array.isArray(bodyGroupIds) || bodyGroupIds.length === 0) {
      return NextResponse.json(
        { error: "Body group IDs array is required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const EXERCISES_DB = process.env.NOTION_EXERCISES_DB!;

    // Fetch all exercises
    const response = await notion.databases.query({
      database_id: EXERCISES_DB,
    });

    // Fetch body group names for display
    const bodyGroupNameMap = new Map<string, string>();
    for (const id of bodyGroupIds) {
      try {
        const bgPage = await notion.pages.retrieve({ page_id: id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bgName = (bgPage as any).properties.Name?.title?.[0]?.plain_text || "";
        bodyGroupNameMap.set(id, bgName);
      } catch (e) {
        console.error(`Failed to fetch body group ${id}:`, e);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exercises = response.results
      .map((page: any) => {
        const bodyGroupRelations = page.properties["Body Group"]?.relation || [];
        const bodyGroupIds_ = bodyGroupRelations.map((rel: any) => rel.id);
        // Get the first body group's name
        const bodyGroupName = bodyGroupIds_.length > 0 ? bodyGroupNameMap.get(bodyGroupIds_[0]) : undefined;
        const exerciseName = page.properties.Name?.title?.[0]?.plain_text || "";

        return {
          id: page.id,
          name: exerciseName,
          bodyGroupIds: bodyGroupIds_,
          bodyGroupName,
          best: page.properties.Best?.number || 0,
        };
      })
      // Filter exercises that belong to any of the requested body groups
      .filter((ex: any) =>
        ex.bodyGroupIds.some((id: string) => bodyGroupIds.includes(id))
      );

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises by body groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}
