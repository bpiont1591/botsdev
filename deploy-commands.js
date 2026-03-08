import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "settings.json"), "utf8")
);

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commands }
);

console.log("✅ Slash commands zarejestrowane.");
