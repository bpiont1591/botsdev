import { Client, Collection, GatewayIntentBits, Events } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ===== POPRAWNE __dirname W ESM ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== WCZYTANIE CONFIG ===== */
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "settings.json"), "utf8")
);

const channels = JSON.parse(
  fs.readFileSync(path.join(__dirname, "channels.json"), "utf8")
);

/* ===== CLIENT ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,

    // jeśli logujesz invite (kto kogo zaprosił) -> to jest potrzebne:
    GatewayIntentBits.GuildInvites,

    // do klasycznych wiadomości (opcjonalnie)
    GatewayIntentBits.GuildMessages
    // MessageContent NIE jest potrzebny do slashy/selectów
  ]
});

/* ===== KOLEKCJE ===== */
client.commands = new Collection();
client.events = new Collection();

// (dla invite tracking) cache zaproszeń
client.invitesCache = new Map();

/* ===== ŁADOWANIE KOMEND ===== */
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

/* ===== ŁADOWANIE EVENTÓW ===== */
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))
  : [];

for (const file of eventFiles) {
  const mod = await import(`./events/${file}`);
  const event = mod?.default;

  if (!event?.name || typeof event.execute !== "function") {
    console.warn(`⚠️ Pomijam event ${file} (brak name lub execute)`);
    continue;
  }

  // zapis do kolekcji, żeby dało się odwołać np. z innych miejsc
  client.events.set(event.name, event);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client, settings, channels));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client, settings, channels));
  }
}

/* ===== OBSŁUGA INTERAKCJI (1 miejsce, bez dublowania) ===== */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction, client);
      return;
    }

    // select menu (ticket itp.)
    if (interaction.isStringSelectMenu()) {
      // jeżeli masz osobny event file pod InteractionCreate, to możesz go wywołać ręcznie:
      const handler = client.events.get(Events.InteractionCreate)?.execute;
      if (handler) {
        await handler(interaction, client, settings, channels);
      }
      return;
    }
  } catch (error) {
    console.error("❌ Błąd InteractionCreate:", error);

    // bezpieczna odpowiedź
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Wystąpił błąd.", ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ Wystąpił błąd.", ephemeral: true }).catch(() => {});
      }
    }
  }
});

/* ===== LOGIN BOTA ===== */
client.login(settings.token || process.env.TOKEN);