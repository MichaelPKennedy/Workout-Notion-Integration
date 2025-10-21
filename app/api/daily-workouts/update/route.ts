import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function POST(request: Request) {
  try {
    const { date, completed } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const DAILY_WORKOUTS_DB = "e3c8ab0b219c47f4876a673025eee943";

    // Query for the daily workout entry by date
    const response = await notion.databases.query({
      database_id: DAILY_WORKOUTS_DB,
      filter: {
        property: "Date",
        date: {
          equals: date,
        },
      },
    });

    if (response.results.length === 0) {
      return NextResponse.json(
        { error: "Daily workout entry not found for this date" },
        { status: 404 }
      );
    }

    const pageId = response.results[0].id;

    // Update the page with completed status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notion.pages.update({
      page_id: pageId,
      properties: {
        Completed: {
          checkbox: completed === true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daily workout marked as completed",
    });
  } catch (error) {
    console.error("Error updating daily workout:", error);
    return NextResponse.json(
      { error: "Failed to update daily workout" },
      { status: 500 }
    );
  }
}
