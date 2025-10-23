# Bot-Nachrichtenoffizier

A TTT-Discord bot for weekly event and topic overviews.

## Features
- Weekly overview (events & topics)
- Slash commands for event/topic management
- Role-based permissions

## Installation
```bash
git clone https://github.com/TacticalTrainingTeam/bot-nachrichtenoffizier.git
cd bot-nachrichtenoffizier
pnpm install
```

## Usage
Set environment variables in `.env`:
- `DISCORD_TOKEN` (bot token)
- `CLIENT_ID` (client ID)

Start the bot:
```bash
pnpm start
```

## Docker
```bash
docker build -t nachrichtenoffizier .
docker run --env DISCORD_TOKEN=... --env CLIENT_ID=... nachrichtenoffizier
```

