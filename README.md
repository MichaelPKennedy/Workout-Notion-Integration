# Workout Notion Integration

A Next.js application that integrates with your Notion workspace to streamline workout tracking. This app allows you to create workout plans from predefined templates, which automatically populate your Notion "Weekly Workout Plan" database with exercises, default sets, and reps.

## Features

- **Workout Templates**: Pre-configured workout routines (Chest & Triceps, Back & Biceps, Legs, Shoulders & Core, Climbing)
- **One-Click Workout Creation**: Select a template and date to automatically create workout entries in Notion
- **Per-Exercise Tracking**: Each exercise gets its own entry with sets, reps, and max weight fields
- **Default Values**: Templates include default sets and reps that you can modify in Notion
- **Notion Integration**: Seamlessly connects to your existing Notion databases

## Prerequisites

- Node.js 18+ installed
- A Notion account with:
  - Body Groups database
  - Exercises database
  - Weekly Workout Plan database
- Notion API integration token with access to these databases

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd workout-notion-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory with your Notion credentials:
   ```
   NOTION_API_KEY=your_notion_integration_token
   NOTION_BODY_GROUPS_DB=your_body_groups_database_id
   NOTION_EXERCISES_DB=your_exercises_database_id
   NOTION_WEEKLY_WORKOUT_DB=your_weekly_workout_plan_database_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Workout from a Template

1. **Select a Date**: Choose when you want to do the workout
2. **Choose a Template**: Pick from predefined templates like "Chest & Triceps" or "Back & Biceps"
3. **Preview**: See which exercises will be included with their default sets and reps
4. **Create**: Click "Create Workout in Notion" to generate individual entries for each exercise
5. **Update in Notion**: Open your Weekly Workout Plan in Notion to log your actual performance (sets, reps, max weight)

### Available Templates

- **Chest & Triceps**: Bench Press, Push-ups, Tricep Dips, Skull Crushers
- **Back & Biceps**: Pull-ups, Rows, Bicep Curls, Hammer Curls
- **Legs**: Squats, Lunges
- **Shoulders & Core**: Shoulder Press, Lateral Raises, Planks, Crunches
- **Climbing**: Bouldering

### Customizing Templates

Edit the templates in `lib/templates-storage.ts` to:
- Add new workout templates
- Modify default exercises
- Change default sets and reps
- Create custom workout combinations

## Project Structure

```
workout-notion-app/
├── app/
│   ├── api/
│   │   ├── body-groups/    # Fetch body groups from Notion
│   │   ├── exercises/      # Fetch exercises from Notion
│   │   ├── templates/      # Manage workout templates
│   │   └── workouts/       # Create and fetch workouts
│   └── page.tsx            # Main UI
├── lib/
│   ├── notion.ts           # Notion client configuration
│   └── templates-storage.ts # Workout template management
├── types/
│   └── workout.ts          # TypeScript type definitions
└── .env.local              # Environment variables (not in git)
```

## API Endpoints

### GET `/api/body-groups`
Fetches all body groups from Notion

### GET `/api/exercises`
Fetches all exercises from Notion with their linked body groups

### GET `/api/templates`
Returns all available workout templates

### POST `/api/workouts`
Creates workout entries in Notion from a template

**Request body:**
```json
{
  "templateId": "1",
  "date": "2025-10-21"
}
```

### GET `/api/workouts`
Fetches workout entries from Notion (optionally filtered by date range)

**Query parameters:**
- `startDate`: Filter workouts on or after this date
- `endDate`: Filter workouts on or before this date

## How It Works

1. **Template Selection**: When you select a workout template, the app shows you a preview of exercises that will be created
2. **Exercise Lookup**: The app queries your Notion Exercises database to match exercise names with their IDs
3. **Bulk Creation**: For each exercise in the template, the app creates a new page in your Weekly Workout Plan database with:
   - The workout date
   - A link to the exercise
   - Default sets and reps from the template
   - Max weight initialized to 0
4. **Manual Updates**: You then open Notion to update the actual values after completing your workout

## Future Enhancements

- [ ] In-app workout tracking (update sets, reps, weight without opening Notion)
- [ ] Workout history and progress tracking
- [ ] Custom template builder in the UI
- [ ] Exercise library management
- [ ] Workout statistics and analytics
- [ ] Mobile-responsive design improvements

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Notion SDK**: Official Notion API client
- **React**: UI library

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or contact the maintainer.
