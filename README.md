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
npm install
```

## Usage
Set environment variables in `.env`:
- `DISCORD_TOKEN` (bot token)
- `CLIENT_ID` (client ID)

Start the bot:
```bash
npm start
```

## Docker
### Mit Docker Compose (empfohlen):
```bash
docker-compose up -d
```

### Mit Docker direkt:
```bash
docker build -t nachrichtenoffizier .
docker run -d --name bot-nachrichtenoffizier \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  nachrichtenoffizier
```

**Wichtig:** Die Datenbank wird in `./data/botdata.sqlite` gespeichert und persistiert über Container-Neustarts hinweg.

