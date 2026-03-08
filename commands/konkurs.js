import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  MessageFlags 
} from "discord.js";

const ALLOWED_CHANNEL_ID = "1474209707253301368"; // <- TU WPISZ ID KANAŁU

export default {
  data: new SlashCommandBuilder()
    .setName("konkurs")
    .setDescription("Tworzy nowy konkurs")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option.setName("nazwa")
        .setDescription("Nazwa konkursu")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("czas")
        .setDescription("Czas trwania w minutach")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("wygrani")
        .setDescription("Ilość zwycięzców")
        .setRequired(true)
    ),

  async execute(interaction) {

    // 🔒 BLOKADA KANAŁU
    if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ Ta komenda może być używana tylko na wyznaczonym kanale konkursowym!",
        flags: MessageFlags.Ephemeral
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
      channelId: interaction.channel.id
    });

    await interaction.reply({
      content: `✅ Konkurs **${nazwa}** został uruchomiony!`,
      flags: MessageFlags.Ephemeral
    });

    interaction.client.emit("startContestPanel", contestId);
  }
};