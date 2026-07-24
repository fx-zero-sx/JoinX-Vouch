# Vouch Bot

A premium, lightweight Discord.js v14 bot focused entirely on customer vouches/reviews.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Discord application/bot**
   - Go to https://discord.com/developers/applications → New Application
   - Bot tab → Add Bot → copy the token
   - OAuth2 → URL Generator → scopes: `bot`, `applications.commands` → permissions: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Manage Messages` (for cleanup on delete) → use the generated URL to invite the bot to your server

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `DISCORD_TOKEN` — your bot token
   - `CLIENT_ID` — your application ID (General Information tab)
   - `GUILD_ID` — (optional) a server ID for instant command registration during development; leave blank for global commands
   - `VOUCH_CHANNEL_ID` — the channel where reviews should be posted

4. **Register slash commands**
   ```bash
   npm run deploy
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## Commands

| Command | Description |
|---|---|
| `/vouch` | Opens a modal to submit Product Name, Rating (1–5), and a Review Message. Optional image attachment via the command itself. 10-minute cooldown per user. |
| `/reviews` | Paginated list of recent reviews, 10 per page, with ⬅/➡ buttons. |
| `/delete review_id:<id>` | Deletes a review by ID. Requires **Manage Server** permission. |
| `/help` | Shows the help menu. |

## How it works

- **Database**: SQLite via `better-sqlite3`, stored at `database/vouch.sqlite` (auto-created on first run). Tables: `reviews`, `votes` (one vote per user per review per type), `cooldowns`.
- **Images**: Since Discord modals only accept text fields, the optional image is captured from the `/vouch` command's attachment option *before* the modal opens, then briefly held in memory (`utils/pendingImages.js`) and merged in once the modal is submitted.
- **Buttons**: Helpful/Favorite votes are enforced one-per-user-per-review at the database level (`UNIQUE`-style primary key on `votes`). Copy Review replies ephemerally with a code block. Pagination re-renders the same message via `interaction.update`, so there's no lingering collector to leak memory.
- **Permissions**: `/delete` sets `ManageGuild` as its default required permission (hides the command from members without it) and also re-checks at runtime in case a server admin has customized command permissions.

## Folder structure

```
commands/       slash command definitions + execute()
events/         ready.js, interactionCreate.js (routes commands/buttons/modals)
components/     button row builders
modals/         the /vouch submission modal
database/       better-sqlite3 setup + queries
utils/          embeds, cooldown formatting, pending-image bridge
config/         static config (color, cooldown length, page size)
index.js        bot entry point
deploy-commands.js   registers slash commands with Discord
```
