import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { exerciseIds } = await request.json();

    if (!exerciseIds || !Array.isArray(exerciseIds)) {
      return NextResponse.json(
        { error: "Exercise IDs array is required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    // Fetch personal best for each exercise
    const bests: { [key: string]: number } = {};

    for (const exerciseId of exerciseIds) {
      try {
        const page = await notion.pages.retrieve({ page_id: exerciseId });
        const best = (page as any).properties?.best?.number || 0;
        bests[exerciseId] = best;
      } catch (error) {
        console.error(
          `Failed to fetch best for exercise ${exerciseId}:`,
          error
        );
        bests[exerciseId] = 0;
      }
    }

    return NextResponse.json(bests);
  } catch (error) {
    console.error("Error fetching personal bests:", error);
    return NextResponse.json(
      { error: "Failed to fetch personal bests" },
      { status: 500 }
    );
  }
}
