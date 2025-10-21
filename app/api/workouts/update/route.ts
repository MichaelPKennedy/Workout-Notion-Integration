import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { pageId, totalSets, totalReps, maxWeight } = await request.json();

    if (!pageId) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    // Update the page with actual values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notion.pages.update({
      page_id: pageId,
      properties: {
        "Total Sets": {
          number: totalSets,
        },
        "Total Reps": {
          number: totalReps,
        },
        "Max Weight": {
          number: maxWeight || 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Updated workout in Notion",
    });
  } catch (error) {
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}
