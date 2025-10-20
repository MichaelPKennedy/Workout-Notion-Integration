import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { BodyGroup } from '@/types/workout';

export async function GET() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const BODY_GROUPS_DB = process.env.NOTION_BODY_GROUPS_DB!;

    const response = await notion.databases.query({
      database_id: BODY_GROUPS_DB,
    });

    const bodyGroups: BodyGroup[] = response.results.map((page: any) => ({
      id: page.id,
      name: page.properties.Name?.title?.[0]?.plain_text || '',
    }));

    return NextResponse.json(bodyGroups);
  } catch (error) {
    console.error('Error fetching body groups:', error);
    return NextResponse.json({ error: 'Failed to fetch body groups' }, { status: 500 });
  }
}
