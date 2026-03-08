import { Events } from "discord.js";

// Gotowa reklama do kopiowania
function buildServerAd({ serverName }) {
  return (
    `🚀 **${serverName} — usługi i realizacje**\n\n` +
    `Tworzę:\n` +
    `• 🤖 boty Discord (komendy, panele, automatyzacje)\n` +
    `• 🌐 strony internetowe (landing / firmowe / portfolio)\n\n` +
    `🌍 Strona: https://whitecode.pages.dev/\n` +
    `🔗 Discord: https://discord.gg/KnNXP2XavC\n\n` +
    `Masz pomysł? Napisz — wycena i termin ustalane indywidualnie.`
  );
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (!interaction.isButton()) return;

      if (interaction.customId === "partner_copy_ad") {
        const serverName = interaction.guild?.name || "WhiteCode";

        // Używamy ephemeral:true (pewniejsze niż flags w części konfiguracji)
        await interaction.reply({
          ephemeral: true,
          content:
            `📋 **Gotowa reklama do skopiowania:**\n\n` +
            "```md\n" +
            buildServerAd({ serverName }) +
            "\n```",
        });

        return;
      }
    } catch (e) {
      console.error("partner-panel-interaction error:", e);

      // awaryjnie: jeśli już odpowiedział, nie próbuj reply drugi raz
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ ephemeral: true, content: "❌ Wystąpił błąd. Spróbuj ponownie." }).catch(() => {});
      }
    }
  },
};