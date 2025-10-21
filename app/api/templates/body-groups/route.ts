import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    // Fetch the template page to get its body groups
    const templatePage = await notion.pages.retrieve({ page_id: templateId });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyGroupIds = (templatePage as any).properties["Body Groups"]?.relation?.map(
      (rel: any) => rel.id
    ) || [];

    return NextResponse.json({ bodyGroupIds });
  } catch (error) {
    console.error("Error fetching template body groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch template body groups" },
      { status: 500 }
    );
  }
}
