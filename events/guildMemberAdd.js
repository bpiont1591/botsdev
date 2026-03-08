import { Events, MessageFlags } from "discord.js";

function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0x7289da;
}

export default {
  name: Events.GuildMemberAdd,

  async execute(member, client, settings, channels) {
    try {
      if (!member?.guild) return;

      const channelId = channels?.welcomeChannel;
      if (!channelId) return;

      const channel = member.guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) return;

      const accentColor = parseAccentColor(settings?.headerColor);
      const bannerUrl = "https://i.imgur.com/mW5CIsC.png";
      const memberCount = member.guild.memberCount;

      const verifyChannel = channels?.verifyChannel
        ? `<#${channels.verifyChannel}>`
        : "`🔓︲odblokuj-dostęp`";

      const rulesChannel = channels?.rulesChannel
        ? `<#${channels.rulesChannel}>`
        : "`📜︲regulamin-serwera`";

      const mention = `<@${member.id}>`;

      const avatarUrl = member.user.displayAvatarURL({
        extension: "png",
        size: 256,
        forceStatic: false,
      });

      const joinTimestamp = Math.floor((member.joinedTimestamp ?? Date.now()) / 1000);

      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: 17,
            accent_color: accentColor,
            components: [
              // Banner
              {
                type: 12,
                items: [{ media: { url: bannerUrl } }],
              },

              // SECTION max 3 teksty (avatar obok)
              {
                type: 9,
                components: [
                  { type: 10, content: `# NOWA OSOBA` },
                  { type: 10, content: `Witamy ${mention}` },
                  { type: 10, content: `Data dołączenia: <t:${joinTimestamp}:F>` },
                ],
                accessory: {
                  type: 11,
                  media: { url: avatarUrl },
                },
              },

              // ID już poza SECTION (bez limitu 3)
              {
                type: 10,
                content: `ID użytkownika: \`${member.id}\``,
              },

              { type: 14, divider: true, spacing: 1 },

              {
                type: 10,
                content:
                  `Jesteś naszym **${memberCount}** użytkownikiem!\n\n` +
                  `> Aby odblokować dostęp przejdź na ${verifyChannel} i zweryfikuj się.\n` +
                  `> Koniecznie zapoznaj się z regulaminem na ${rulesChannel}.\n\n` +
                  `Miłego pobytu — "99% bugów siedzi między klawiaturą a krzesłem."`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("Błąd podczas wysyłania wiadomości powitalnej:", error);
    }
  },
};