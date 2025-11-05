# Bot-Nachrichtenoffizier

A Discord bot for TTT (Tactical Training Team) that manages weekly event and topic overviews.

## Features
- Automated weekly summaries (events & topics)
- Slash commands for event/topic management
- Role-based permissions (Admin & Event Manager)
- Discord event synchronization
- Scheduled cron-based posting

## Installation

```bash
git clone https://github.com/TacticalTrainingTeam/bot-nachrichtenoffizier.git
cd bot-nachrichtenoffizier
pnpm install
```

## Configuration

Create a `.env` file based on `.env.example`:
- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `CLIENT_ID` - Application client ID
- `POST_CRON` - Cron expression for weekly posts (e.g., `0 19 * * SUN`)
- `TIMEZONE` - Timezone for cron jobs (default: `Europe/Berlin`)

## Usage

Deploy slash commands:
```bash
pnpm run deploy-commands
```

Start the bot:
```bash
pnpm start
```

## Docker Deployment

### Using Docker Compose (recommended):
```bash
docker-compose up -d
```

### Using Docker directly:
```bash
docker build -t nachrichtenoffizier .
docker run -d --name bot-nachrichtenoffizier \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  nachrichtenoffizier
```

**Note:** The database is stored in `./data/botdata.sqlite` and persists across container restarts.

## Commands

- `/config channel` - Set target channel for weekly posts
- `/thema hinzufügen` - Add a topic
- `/thema löschen` - Delete a topic by ID
- `/event hinzufügen` - Add an event
- `/event löschen` - Delete an event by ID
- `/aufräumen datenbank` - Clear all topics and events
- `/aufräumen discord-sync` - Sync Discord events to database
- `/wochenüberblick` - Post a test weekly summary

## License

See [LICENSE](LICENSE) file for details.

