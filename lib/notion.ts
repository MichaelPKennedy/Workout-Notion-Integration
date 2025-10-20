import { Client } from '@notionhq/client';

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const DATABASES = {
  BODY_GROUPS: process.env.NOTION_BODY_GROUPS_DB!,
  EXERCISES: process.env.NOTION_EXERCISES_DB!,
  WEEKLY_WORKOUT: process.env.NOTION_WEEKLY_WORKOUT_DB!,
};
