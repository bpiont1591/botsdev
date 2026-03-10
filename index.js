import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appConfig, requireDiscordToken } from "./config/appConfig.js";
import { readJsonSafe } from "./lib/jsonStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settings = readJsonSafe(path.join(__dirname, "settings.json"), {});
const channels = readJsonSafe(path.join(__dirname, "channels.json"), {});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
client.invitesCache = new Map();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.existsSync(commandsPath)
  ? fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))
  : [];

for (const file of commandFiles) {
  const mod = await import(`./commands/${file}`);
  const command = mod?.default;

  if (!command?.data?.name || typeof command.execute !== "function") {
    console.warn(`⚠️ Pomijam komendę ${file} (brak data.name lub execute)`);
    continue;
  }

  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))
  : [];

for (const file of eventFiles) {
  try {
    const mod = await import(`./events/${file}`);
    const event = mod?.default;

    if (!event?.name || typeof event.execute !== "function") {
      console.warn(`⚠️ Pomijam event ${file} (brak name lub execute)`);
      continue;
    }

    const handler = (...args) => event.execute(...args, client, settings, channels);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  } catch (error) {
    console.error(`❌ Nie udało się załadować eventu ${file}:`, error);
  }
}

const token = requireDiscordToken() || appConfig.discord.token;
client.login(token);
