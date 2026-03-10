import { Events, MessageFlags } from "discord.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    try {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    } catch (error) {
      console.error("❌ Błąd komendy:", error);
      if (!interaction.isRepliable()) return;

      const payload = { content: "❌ Wystąpił błąd podczas wykonywania komendy.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
