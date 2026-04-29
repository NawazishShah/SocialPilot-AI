# PostPilot Admin Dashboard

React + TypeScript + TailwindCSS admin dashboard for the PostPilot AI social media automation system.

## Features

- **Dashboard**: Overview of engine status, pending posts, and quick analytics
- **Posts**: View, approve, and reject generated posts
- **Logs**: View automation execution logs with filtering
- **Engine**: Start and stop the automation engine
- **Topics**: Manage topic bank for content generation
- **Analytics**: View posting performance metrics

## Setup

1. Install dependencies:
```bash
cd admin
npm install
```

2. Configure API endpoint:
   - The dashboard proxies `/api` requests to `http://localhost:3002` (configured in `vite.config.ts`)
   - Set your API key in localStorage: `localStorage.setItem('apiKey', 'your-api-key')`

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Build for production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Vite** - Build tool

## API Endpoints

The dashboard connects to the following backend endpoints:

- `GET /api/engine/status` - Get engine status
- `POST /api/engine/start` - Start engine
- `POST /api/engine/stop` - Stop engine
- `GET /api/content` - List posts
- `PUT /api/content/:id/approve` - Approve post
- `PUT /api/content/:id/reject` - Reject post
- `GET /api/logs` - List automation logs
- `GET /api/analytics` - List analytics data
- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/topics` - List topics
- `POST /api/topics` - Create topic
- `DELETE /api/topics/:id` - Delete topic

## Folder Structure

```
admin/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   └── Badge.tsx
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Posts.tsx
│   │   ├── Logs.tsx
│   │   ├── Engine.tsx
│   │   ├── Topics.tsx
│   │   └── Analytics.tsx
│   ├── lib/            # Utilities
│   │   └── api.ts      # API client
│   ├── types/          # TypeScript types
│   │   └── index.ts
│   ├── App.tsx         # Main app with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies
```
