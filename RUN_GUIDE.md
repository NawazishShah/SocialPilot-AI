# PostPilot AI - Step-by-Step Run Instructions

## Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** database
3. **Redis** server
4. **OpenAI API key**

## Initial Setup

### 1. Clone and Install Dependencies

```bash
cd PostPilot-AI
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/postpilot"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# API Key for Admin Dashboard
API_KEY="your-secret-api-key"

# Optional: Run Mode (all/server/worker/scheduler)
RUN_MODE=all
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed database
npm run db:seed
```

### 4. Verify Database Connection

```bash
npm run db:studio
```

This opens Prisma Studio to inspect your database.

## Running the System

### Development Mode

#### Option 1: Run All Components (Recommended for Local Dev)

```bash
npm run dev
```

This starts:
- HTTP API server (port 3001)
- BullMQ workers (content generation, post publishing, posting pipeline)
- Scheduler runner (polls every 15s)

#### Option 2: Run Components Separately

For development and debugging, you can run components in separate terminals:

**Terminal 1 - API Server:**
```bash
npm run dev:server
```

**Terminal 2 - Workers:**
```bash
npm run dev:worker
```

**Terminal 3 - Scheduler:**
```bash
npm run dev:scheduler
```

### Production Mode

#### Build the Project

```bash
npm run build
```

#### Run All Components

```bash
npm start
```

#### Run Components Separately

```bash
npm run start:server    # API server only
npm run start:worker    # Workers only
npm run start:scheduler # Scheduler only
```

## Admin Dashboard

### Start Admin Dashboard

In a separate terminal:

```bash
cd admin
npm install
npm run dev
```

The dashboard will be available at http://localhost:5173

### Set API Key in Dashboard

Open browser console (F12) and run:

```javascript
localStorage.setItem('apiKey', 'your-secret-api-key')
```

## Creating Your First Automated Post

### 1. Add a Social Media Account

Use the API to add an account:

```bash
curl -X POST http://localhost:3001/api/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "platform": "twitter",
    "username": "your_username",
    "email": "your_email@example.com",
    "password": "your_password"
  }'
```

### 2. Add Topics

Via API:

```bash
curl -X POST http://localhost:3001/api/topics \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "text": "AI and machine learning trends",
    "platform": "twitter"
  }'
```

Or via the Admin Dashboard at http://localhost:5173/topics

### 3. Create a Schedule

```bash
curl -X POST http://localhost:3001/api/schedules \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "accountId": "account-id-from-step-1",
    "cadence": "daily",
    "dailyHour": 9,
    "dailyMinute": 0,
    "timezone": "America/New_York",
    "contentConfig": {
      "topic": "AI and machine learning trends",
      "style": "professional"
    },
    "autoPublish": true
  }'
```

### 4. Start the Engine

```bash
curl -X POST http://localhost:3001/api/engine/start \
  -H "x-api-key: your-secret-api-key"
```

Or via the Admin Dashboard at http://localhost:5173/engine

The scheduler will now automatically:
1. Detect when the schedule is due
2. Generate AI content based on the topic
3. Post to the platform using Playwright
4. Log the results

### 5. Monitor Progress

**View Generated Posts:**
```bash
curl http://localhost:3001/api/content \
  -H "x-api-key: your-secret-api-key"
```

Or via Admin Dashboard at http://localhost:5173/posts

**View Logs:**
```bash
curl http://localhost:3001/api/logs \
  -H "x-api-key: your-secret-api-key"
```

Or via Admin Dashboard at http://localhost:5173/logs

**View Analytics:**
```bash
curl http://localhost:3001/api/analytics \
  -H "x-api-key: your-secret-api-key"
```

Or via Admin Dashboard at http://localhost:5173/analytics

## Manual Post Generation

To generate content without scheduling:

```bash
curl -X POST http://localhost:3001/api/content/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "accountId": "account-id",
    "platform": "twitter",
    "topic": "AI trends in 2024",
    "style": "professional"
  }'
```

## Manual Post Publishing

To publish an approved post:

```bash
curl -X POST http://localhost:3001/api/pipeline/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "scheduleId": "schedule-id"
  }'
```

## Stopping the System

### Stop Engine (Pauses Scheduling)

```bash
curl -X POST http://localhost:3001/api/engine/stop \
  -H "x-api-key: your-secret-api-key"
```

Or via Admin Dashboard

### Stop All Processes

Press `Ctrl+C` in each terminal to stop the components gracefully.

The system will:
- Stop accepting new jobs
- Complete in-progress jobs
- Close database connections
- Close Redis connections
- Release browser contexts

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Should return PONG
```

### Browser Automation Issues

- Ensure Playwright browsers are installed:
```bash
npx playwright install
```

- Check screenshots directory exists:
```bash
mkdir -p screenshots
mkdir -p sessions
```

### Jobs Not Processing

1. Check workers are running: Look for "✅ BullMQ workers started" in logs
2. Check Redis: `redis-cli` → `KEYS bull:*` to see queue keys
3. Check engine status: `curl http://localhost:3001/api/engine/status`
4. Check schedule status: Should be "active"

### Rate Limiting Errors

- Adjust rate limits in `src/jobs/workers.ts`
- Increase backoff delays in `src/config/constants.ts`
- Add delays between posts in schedule

## Monitoring

### View Logs

Logs are output to console with structured JSON format. For pretty printing:

```bash
npm run dev | pino-pretty
```

### Monitor Redis Queues

```bash
redis-cli
> KEYS bull:*
> LLEN bull:posting-pipeline:waiting
> LLEN bull:posting-pipeline:active
```

### Monitor Database

```bash
npm run db:studio
```

## Production Deployment

### Using PM2

```bash
npm install -g pm2

# API Server
pm2 start dist/main.js --name "postpilot-server" --env RUN_MODE=server

# Workers
pm2 start dist/main.js --name "postpilot-worker" --env RUN_MODE=worker

# Scheduler
pm2 start dist/main.js --name "postpilot-scheduler" --env RUN_MODE=scheduler

# Save PM2 config
pm2 save
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
COPY dist ./dist

RUN npx prisma generate

CMD ["node", "dist/main.js"]
```

Build and run:

```bash
docker build -t postpilot .
docker run -p 3001:3001 --env-file .env postpilot
```

### Scaling Workers

Run multiple worker instances:

```bash
# Instance 1
RUN_MODE=worker npm start

# Instance 2
RUN_MODE=worker npm start

# Instance 3
RUN_MODE=worker npm start
```

BullMQ will automatically distribute jobs across workers.

## Security Best Practices

1. **Never commit `.env` file** - Use environment variables in production
2. **Use strong API keys** - Generate random 32+ character keys
3. **Encrypt credentials** - Use environment-specific encryption
4. **Rate limit API** - Add rate limiting middleware
5. **Use HTTPS** - Terminate SSL at reverse proxy (nginx, traefik)
6. **Rotate secrets** - Regularly rotate API keys and database passwords
7. **Audit logs** - Monitor logs for suspicious activity

## Backup Strategy

### Database Backups

```bash
# Daily backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

### Redis Backups

```bash
# Enable Redis persistence in redis.conf
save 900 1
save 300 10
save 60 10000
```

### Session Backups

The `sessions/` directory contains browser session data. Backup regularly:

```bash
tar -czf sessions_backup.tar.gz sessions/
```
