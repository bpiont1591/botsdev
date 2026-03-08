import { REST, Routes } from "discord.js";
import fs from "node:fs";
import { appConfig, requireDiscordToken } from "./config/appConfig.js";

const token = requireDiscordToken();
const clientId = appConfig.discord.clientId;
const guildId = appConfig.discord.guildId;

if (!clientId || !guildId) {
  throw new Error("Brak DISCORD_CLIENT_ID lub DISCORD_GUILD_ID.");
}

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
console.log("✅ Slash commands zarejestrowane.");
