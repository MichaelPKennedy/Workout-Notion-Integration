import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { pageId, totalSets, totalReps, maxWeight, completed } = await request.json();

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

    // Build properties object dynamically
    const properties: any = {};

    if (totalSets !== undefined) {
      properties["Total Sets"] = { number: totalSets };
    }

    if (totalReps !== undefined) {
      properties["Total Reps"] = { number: totalReps };
    }

    if (maxWeight !== undefined) {
      properties["Max Weight"] = { number: maxWeight || 0 };
    }

    if (completed !== undefined) {
      properties["Completed"] = { checkbox: completed };
    }

    // Update the page with actual values
    await notion.pages.update({
      page_id: pageId,
      properties,
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
