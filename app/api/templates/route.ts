import { NextResponse } from 'next/server';
import { getTemplates, createTemplate } from '@/lib/templates-storage';
import { WorkoutTemplate } from '@/types/workout';

export async function GET() {
  try {
    const templates = getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<WorkoutTemplate, 'id'> = await request.json();
    const newTemplate = createTemplate(body);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
