import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { DateTime } from "luxon";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const DAILY_WORKOUTS_DB = "e3c8ab0b219c47f4876a673025eee943";

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
      database_id: DAILY_WORKOUTS_DB,
      ...(Object.keys(filter).length > 0 && { filter }),
      sorts: [
        {
          property: "Date",
          direction: "ascending",
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyWorkouts = response.results.map((page: any) => {
      const dateValue = page.properties.Date?.date?.start || "";
      // Extract just the date part (YYYY-MM-DD) from full datetime strings
      const dateOnly = dateValue ? DateTime.fromISO(dateValue).toISODate() : "";
      return {
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || "",
        date: dateOnly,
        completed: page.properties.Completed?.checkbox || false,
      };
    });

    return NextResponse.json(dailyWorkouts);
  } catch (error) {
    console.error("Error fetching daily workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily workouts" },
      { status: 500 }
    );
  }
}
