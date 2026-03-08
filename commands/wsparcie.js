import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";

const SUPPORT_PATH = path.resolve("./support.json");
let supportData = JSON.parse(fs.readFileSync(SUPPORT_PATH, "utf-8"));

// ID developera
const DEV_ID = "1418289596457812088";

export default {
  data: new SlashCommandBuilder()
    .setName("wsparcie")
    .setDescription("Zarządzaj wsparciem bota lub kontaktuj się z developerem"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Math.floor(Date.now() / 1000);

    // --- Sprawdzenie aktywności wsparcia ---
    const supportEnd = supportData[userId] || 0;
    const active = supportEnd > now;

    // --- Embedopodobny container v2 ---
    const embedContainer = {
      type: 17, // Container v2
      accent_color: 0x00FFFF, // kolor embedu, możesz zmienić lub wziąć z settings
      components: [
        { type: 10, content: `🛠 **Wsparcie bota**` },
        { type: 14, divider: true, spacing: 1 },
        { 
          type: 10,
          content:
`Twoje wsparcie: **${active ? "AKTYWNE ✅" : "WYGASŁO ❌"}**
Koniec wsparcia: ${active ? `<t:${supportEnd}:F>` : "Brak aktywnego wsparcia"}

Kontakt z developerem: <@${DEV_ID}>`
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1, // ActionRow
          components: [
            new ButtonBuilder()
              .setCustomId("extend_support")
              .setLabel("Przedłuż wsparcie")
              .setStyle(ButtonStyle.Success)
          ]
        }
      ]
    };

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [embedContainer],
      ephemeral: true
    });
  }
};