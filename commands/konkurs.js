import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { appConfig } from "../config/appConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("konkurs")
    .setDescription("Tworzy nowy konkurs")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) => option.setName("nazwa").setDescription("Nazwa konkursu").setRequired(true))
    .addIntegerOption((option) => option.setName("czas").setDescription("Czas trwania w minutach").setRequired(true))
    .addIntegerOption((option) => option.setName("wygrani").setDescription("Ilość zwycięzców").setRequired(true)),

  async execute(interaction) {
    const allowedChannelId = appConfig.ids.konkursChannelId;

    if (allowedChannelId && interaction.channel.id !== allowedChannelId) {
      return interaction.reply({
        content: "❌ Ta komenda może być używana tylko na wyznaczonym kanale konkursowym!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const nazwa = interaction.options.getString("nazwa");
    const czas = interaction.options.getInteger("czas");
    const wygrani = interaction.options.getInteger("wygrani");

    interaction.client.contests ??= new Map();

    const contestId = Date.now().toString();

    interaction.client.contests.set(contestId, {
      nazwa,
      czas,
      wygrani,
      uczestnicy: new Set(),
      channelId: interaction.channel.id,
    });

    await interaction.reply({
      content: `✅ Konkurs **${nazwa}** został uruchomiony!`,
      flags: MessageFlags.Ephemeral,
    });

    interaction.client.emit("startContestPanel", contestId);
  },
};
