import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import path from "node:path";
import { readJsonSafe } from "../lib/jsonStore.js";
import { appConfig } from "../config/appConfig.js";

const SUPPORT_PATH = path.resolve("./support.json");

function getSupportData() {
  return readJsonSafe(SUPPORT_PATH, {});
}

export default {
  data: new SlashCommandBuilder()
    .setName("wsparcie")
    .setDescription("Zarządzaj wsparciem bota lub kontaktuj się z developerem"),

  async execute(interaction) {
    const supportData = getSupportData();
    const userId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000);
    const supportEnd = supportData[userId] || 0;
    const active = supportEnd > now;
    const devId = appConfig.ids.devId || "brak";

    const embedContainer = {
      type: 17,
      accent_color: 0x00ffff,
      components: [
        { type: 10, content: "🛠 **Wsparcie bota**" },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content: `Twoje wsparcie: **${active ? "AKTYWNE ✅" : "WYGASŁO ❌"}\nKoniec wsparcia: ${
            active ? `<t:${supportEnd}:F>` : "Brak aktywnego wsparcia"
          }\n\nKontakt z developerem: <@${devId}>`,
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1,
          components: [
            new ButtonBuilder().setCustomId("extend_support").setLabel("Przedłuż wsparcie").setStyle(ButtonStyle.Success),
          ],
        },
      ],
    };

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [embedContainer],
      ephemeral: true,
    });
  },
};
