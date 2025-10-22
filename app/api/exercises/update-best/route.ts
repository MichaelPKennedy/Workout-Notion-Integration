import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { exerciseId, newBest } = await request.json();

    if (!exerciseId || newBest === undefined) {
      return NextResponse.json(
        { error: "Exercise ID and new best value are required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    // Update the exercise's Best field
    await notion.pages.update({
      page_id: exerciseId,
      properties: {
        Best: {
          number: newBest,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Personal best updated",
    });
  } catch (error) {
    console.error("Error updating personal best:", error);
    return NextResponse.json(
      { error: "Failed to update personal best" },
      { status: 500 }
    );
  }
}
