import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Exercise } from "@/types/workout";

export async function GET() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const EXERCISES_DB = process.env.NOTION_EXERCISES_DB!;

    const response = await notion.databases.query({
      database_id: EXERCISES_DB,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exercises: Exercise[] = response.results.map((page: any) => {
      const bodyGroupRelation =
        page.properties["Body Group"]?.relation?.[0]?.id || "";
      return {
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || "",
        bodyGroupId: bodyGroupRelation,
      };
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}
