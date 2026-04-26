# PostPilot AI - System Architecture

## Overview

PostPilot AI is a comprehensive social media automation system that uses AI to generate content and Playwright for browser automation to post to social media platforms. The system is built with TypeScript, Node.js, BullMQ for job queuing, Prisma for database management, and Redis for caching and queue management.

## End-to-End Flow

```
Topics (Redis) → AI Generation → Queue → Playwright Automation → Posting → Logging → Analytics
```

### Detailed Pipeline Flow

1. **Topic Selection**: Topics are stored in Redis and can be managed via the API
2. **Schedule Trigger**: Scheduler runner polls for due schedules (every 15s by default)
3. **Job Enqueue**: When a schedule is due, a posting pipeline job is enqueued to BullMQ
4. **AI Content Generation**: 
   - Fetches topic from schedule configuration
   - Generates platform-specific content using OpenAI API
   - Humanizes and formats the content
   - Saves to database as draft/approved
5. **Playwright Automation** (if autoPublish is true):
   - Acquires browser context for the account
   - Logs in if session is invalid
   - Posts content to the platform
   - Takes screenshot for proof
   - Releases browser context
6. **Logging**: Creates PostLog entry with status, duration, error details
7. **Analytics**: Metrics are tracked for engagement analysis

## System Components

### 1. Entry Point (`src/main.ts`)

The main entry point supports multiple running modes:
- **all**: Runs server, workers, and scheduler (default)
- **server**: HTTP API server only
- **worker**: BullMQ job workers only
- **scheduler**: Schedule runner only

```bash
npm run dev              # Run all components
npm run dev:server       # Run API server only
npm run dev:worker       # Run workers only
npm run dev:scheduler    # Run scheduler only
```

### 2. HTTP API Server (`src/server.ts`)

Express-based REST API with the following modules:
- **Content**: CRUD operations for generated posts, approve/reject functionality
- **Schedules**: Manage posting schedules
- **Engine**: Start/stop automation engine (Redis-backed flag)
- **Logs**: View automation execution logs
- **Analytics**: View posting performance metrics
- **Topics**: Manage topic bank (Redis-backed)
- **Pipeline**: Manually trigger posting pipeline

All endpoints require API key authentication via `x-api-key` header.

### 3. BullMQ Job Queues (`src/jobs/queues.ts`)

Five queues manage different types of jobs:

| Queue | Purpose | Retry Config |
|-------|---------|--------------|
| `content-generation` | AI content generation | 3 attempts, exponential backoff (2s) |
| `post-publishing` | Browser automation posting | 2 attempts, fixed backoff (30s) |
| `posting-pipeline` | End-to-end automation | 3 attempts, exponential backoff (15s) |
| `analytics-collection` | Collect engagement metrics | 3 attempts, exponential backoff (5s) |
| `account-health` | Account health checks | 1 attempt (no retry) |

### 4. Workers (`src/jobs/workers.ts`)

Three worker processes handle job execution:

#### Content Generation Worker
- Concurrency: 3
- Rate limit: 10 jobs/minute
- Handles AI content generation jobs

#### Post Publishing Worker
- Concurrency: 2 (browser-intensive)
- Rate limit: 5 jobs/minute
- Handles Playwright automation

#### Posting Pipeline Worker
- Concurrency: 1
- Handles end-to-end posting pipeline

### 5. Processors (`src/jobs/processors/`)

#### `content-generation.processor.ts`
- Calls AI generator with topic, platform, style
- Saves generated content to database
- Enqueues post publishing job if autoPublish is true
- Includes duration tracking and attempt logging

#### `post-publishing.processor.ts`
- Loads content and credentials
- Acquires browser context
- Validates session and logs in if needed
- Posts content via platform adapter
- Takes screenshot for proof
- Updates content status and creates PostLog
- Proper error handling with resource cleanup

#### `posting-pipeline.processor.ts`
- Combines generation and posting in one flow
- Fetches topic from schedule
- Generates and humanizes content
- Posts via Playwright if autoPublish is true
- Comprehensive error handling with detailed logging

### 6. AI Content Generation (`src/ai/`)

#### `content-generation.service.ts`
- Generates platform-specific content
- Anti-repetition system using similarity scoring
- Multiple generation attempts for variety
- Supports different post styles (professional, casual, witty, inspirational)
- Platform-specific character limits and hashtag rules

#### `providers/`
- OpenAI provider implementation
- Structured output generation
- Token usage tracking

### 7. Browser Automation (`src/automation/`)

#### `browser-manager.ts`
- Manages browser contexts per account
- Acquires and releases contexts safely
- Prevents resource leaks

#### `social-media-poster.ts`
- High-level poster interface
- Handles authentication
- Platform-specific posting logic

#### `adapters/`
- Platform-specific adapters (Twitter, LinkedIn, Instagram, Facebook)
- Each adapter implements login, session validation, and posting

### 8. Scheduler (`src/jobs/post-scheduler.ts`)

Supports three scheduling cadences:

#### Hourly
- Runs every hour
- Respects platform quiet hours
- Cron-based scheduling

#### Daily
- Runs at specified hour/minute
- Respects quiet hours
- Cron-based scheduling

#### Random
- Random delay between min and max
- Respects minimum spacing rules
- Respects quiet hours
- Delayed job scheduling

Platform-specific scheduling rules:
- **Twitter**: 45min min spacing, 35-180min random delay
- **LinkedIn**: 120min min spacing, 90-360min random delay
- **Instagram**: 180min min spacing, 120-720min random delay
- **Facebook**: 120min min spacing, 60-480min random delay

### 9. Scheduler Runner (`src/services/scheduler-runner.service.ts`)

- Polls for due schedules every 15 seconds (configurable)
- Checks engine enabled flag (Redis) before enqueuing
- Enqueues posting pipeline jobs for due schedules
- Marks schedules as executed

### 10. Database (Prisma)

#### Models
- **Account**: Social media accounts with credentials
- **Content**: Generated posts with status tracking
- **Schedule**: Posting schedules with configuration
- **PostLog**: Execution logs with error details
- **Analytics**: Engagement metrics

### 11. Services (`src/services/`)

- **account.service**: Account management and credential retrieval
- **content.service**: Content CRUD operations
- **schedule.service**: Schedule management
- **engine.service**: Engine enable/disable flag (Redis)
- **logs.service**: PostLog querying
- **analytics.service**: Analytics aggregation
- **topics.service**: Topic bank management (Redis)

## Error Handling

### Structured Error Logging
All processors use structured logging with:
- Job ID and attempt number
- Duration tracking
- Error messages and stack traces
- Contextual data (account, platform, schedule)

### Retry Strategy
- Exponential backoff for transient failures (AI, network)
- Fixed backoff for rate-limited operations (posting)
- Configurable attempt counts per queue type
- Failed jobs retained for 7-14 days for analysis

### Resource Cleanup
- Browser contexts always released in finally blocks
- Database connections properly closed on shutdown
- Redis connections gracefully closed
- Queue workers stopped cleanly

## Logging System

Uses Pino for structured JSON logging:
- Module-specific loggers (`createModuleLogger`)
- Different log levels (info, warn, error, fatal)
- Contextual metadata in all log entries
- Request/job correlation via IDs

## Security

- API key authentication for all endpoints
- Credentials encrypted in database
- Session persistence for browser contexts
- Environment-based configuration

## Deployment Modes

### Development
```bash
npm run dev              # All components in one process
npm run dev:server       # API server only
npm run dev:worker       # Workers only
npm run dev:scheduler    # Scheduler only
```

### Production
```bash
npm run build            # Compile TypeScript
npm start                # Run all components
npm run start:server     # Run API server only
npm run start:worker     # Run workers only
npm run start:scheduler  # Run scheduler only
```

### Scalable Deployment
For production, deploy components separately:
- Run multiple worker instances for horizontal scaling
- Run scheduler as standalone process
- Run API server with load balancer
- Use Redis cluster for high availability

## Monitoring

### Key Metrics to Track
- Job queue lengths
- Job success/failure rates
- Average job duration
- API response times
- Database query performance
- Redis memory usage
- Browser context pool utilization

### Logs to Monitor
- Failed jobs with error details
- Long-running jobs
- Rate limit errors
- Authentication failures
- Database connection issues

## Data Flow Diagram

```
┌─────────────┐
│   Topics    │ (Redis)
└──────┬──────┘
       │
       v
┌─────────────┐
│  Scheduler  │ (polls every 15s)
└──────┬──────┘
       │
       v
┌─────────────┐
│  BullMQ     │ (posting-pipeline queue)
└──────┬──────┘
       │
       v
┌─────────────────────────────┐
│  Posting Pipeline Processor │
│  1. Fetch schedule          │
│  2. Generate AI content     │
│  3. Humanize & format       │
│  4. Save to DB              │
│  5. Post via Playwright     │
│  6. Log results             │
└─────────────┬───────────────┘
              │
              v
┌─────────────┐      ┌──────────┐
│  Database   │◄────►│  Redis   │
└─────────────┘      └──────────┘
```

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENAI_API_KEY`: OpenAI API key
- `API_KEY`: Admin dashboard API key
- `RUN_MODE`: server/worker/scheduler/all

### Platform Configuration
Platform limits and rules defined in `src/config/constants.ts`:
- Character limits
- Hashtag limits
- Quiet hours
- Minimum spacing
- Random delay ranges
