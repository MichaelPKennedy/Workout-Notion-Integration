import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { date, exerciseId, pageId } = await request.json();

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const WEEKLY_WORKOUT_DB = process.env.NOTION_WEEKLY_WORKOUT_DB!;

    // If pageId is provided, delete directly by page ID
    if (pageId) {
      await notion.pages.update({
        page_id: pageId,
        archived: true,
      });

      return NextResponse.json({
        success: true,
        message: `Deleted workout entry ${pageId}`,
      });
    }

    // Otherwise, find by date and exercise ID
    if (!date || !exerciseId) {
      return NextResponse.json(
        { error: "Either pageId or (date and exerciseId) are required" },
        { status: 400 }
      );
    }

    // Find the workout entry to delete (matching date and exercise)
    const response = await notion.databases.query({
      database_id: WEEKLY_WORKOUT_DB,
      filter: {
        and: [
          {
            property: "Date",
            date: {
              equals: date,
            },
          },
          {
            property: "Exercises",
            relation: {
              contains: exerciseId,
            },
          },
        ],
      },
    });

    // Delete the found workout entry
    if (response.results.length > 0) {
      for (const page of response.results) {
        await notion.pages.update({
          page_id: page.id,
          archived: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted workout entry for exercise ${exerciseId} on ${date}`,
    });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
