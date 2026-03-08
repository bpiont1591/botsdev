import {
  Events,
  ChannelType,
  PermissionFlagsBits,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";

const settingsPath = path.resolve("./settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";

function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0x7289da;
}

// Biały, spójny panel do ephemeral + opcjonalny przycisk LINK
function buildEphemeralPanel({
  title,
  text,
  bannerUrl = BANNER_URL,
  linkUrl,
  linkLabel,
}) {
  const components = [
    { type: 12, items: [{ media: { url: bannerUrl } }] },
    { type: 10, content: `# ${title}` },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: text },
  ];

  if (linkUrl) {
    components.push({
      type: 9, // SECTION
      components: [{ type: 10, content: "Kliknij poniżej, aby przejść do kanału:" }],
      accessory: {
        type: 2, // BUTTON
        style: 5, // LINK
        label: linkLabel || "Przejdź",
        url: linkUrl,
      },
    });
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xFFFFFF,
        components,
      },
    ],
  };
}

// Panel “zamknięte” do edycji wiadomości w kanale ticketa (NIE ephemeral)
function buildClosedTicketPanel() {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xFFFFFF,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },
          { type: 10, content: "# ZGŁOSZENIE" },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: "✅ Twoje zgłoszenie zostało zamknięte." },
          {
            type: 9,
            components: [{ type: 10, content: "Nie możesz już przejść do tego kanału:" }],
            accessory: {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Zamknięte — brak dostępu",
              disabled: true,
              custom_id: "ticket_closed_disabled",
            },
          },
        ],
      },
    ],
  };
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isMessageComponent()) return;

    const { customId, user, guild, channel } = interaction;
    if (!guild || !channel) return;

    /* =======================================================
       TWORZENIE TICKETA
    ======================================================= */
    if (["ticket_pomoc", "ticket_zakupy", "ticket_wspolpraca"].includes(customId)) {
      const categoryMap = {
        ticket_pomoc: "POMOC",
        ticket_zakupy: "ZAKUPY",
        ticket_wspolpraca: "PARTNERSTWO",
      };

      const CATEGORY_ROLES = {
        POMOC: "1476341914923171911",
        ZAKUPY: "1476341949622648952",
        PARTNERSTWO: "1476341994686119936",
      };

      const category = categoryMap[customId];
      const supportRoleId = CATEGORY_ROLES[category];

      const safeUsername = user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 20);

      const channelName = `${category.toLowerCase()}-${safeUsername}`;

      // Sprawdzenie czy kanał już istnieje (po nazwie)
      const existing = guild.channels.cache.find((c) => c.name === channelName);
      if (existing) {
        const existingUrl = `https://discord.com/channels/${guild.id}/${existing.id}`;
        return interaction.reply(
          buildEphemeralPanel({
            title: "TICKET",
            text: "❌ Masz już otwarte zgłoszenie. Kliknij przycisk poniżej, aby do niego przejść.",
            linkUrl: existingUrl,
            linkLabel: "Przejdź do zgłoszenia",
          })
        );
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: supportRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      const accentColor = parseAccentColor(settings.headerColor);
      const createdTs = Math.floor(user.createdTimestamp / 1000);
      const joinedTs = Math.floor((interaction.member?.joinedTimestamp ?? Date.now()) / 1000);

      // Panel ComponentsV2 w kanale ticket
      await ticketChannel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: 17,
            accent_color: accentColor,
            components: [
              { type: 12, items: [{ media: { url: BANNER_URL } }] },
              {
                type: 9,
                components: [
                  { type: 10, content: `# CENTRUM ZGŁOSZEŃ` },
                  { type: 10, content: `Ticket dla: **${user.username}**` },
                  {
                    type: 10,
                    content: `-# KATEGORIA: **${category}** • ROLA: <@&${supportRoleId}>`,
                  },
                ],
                accessory: {
                  type: 2,
                  custom_id: "close_ticket",
                  label: "Zakończ sprawę",
                  style: ButtonStyle.Secondary,
                  emoji: { id: "1476343511879254036", name: "zamknite" },
                },
              },
              { type: 14, divider: true, spacing: 1 },
              {
                type: 10,
                content:
                  `**Dane użytkownika**\n` +
                  `• ID: \`${user.id}\`\n` +
                  `• Konto utworzone: <t:${createdTs}:F>\n` +
                  `• Dołączył na serwer: <t:${joinedTs}:F>\n\n` +
                  `Witamy w systemie obsługi zgłoszeń.\n` +
                  `Aby uzyskać pomoc, dokładnie opisz problem.`,
              },
            ],
          },
        ],
      });

      const ticketUrl = `https://discord.com/channels/${guild.id}/${ticketChannel.id}`;

      // TYLKO PRZYCISK (bez oznaczania kanału)
      return interaction.reply(
        buildEphemeralPanel({
          title: "TICKET UTWORZONY",
          text:
            "Twoje zgłoszenie zostało pomyślnie utworzone. " +
            "Został utworzony prywatny kanał, w którym możesz kontynuować rozmowę z zespołem wsparcia. " +
            "Kliknij poniżej, aby przejść do swojego zgłoszenia i opisać problem szczegółowo.",
          linkUrl: ticketUrl,
          linkLabel: "Przejdź do zgłoszenia",
        })
      );
    }

    /* =======================================================
       ZAMKNIĘCIE TICKETA
    ======================================================= */
    if (customId === "close_ticket") {
      // Edytujemy wiadomość w kanale ticketa (nie ephemeral)
      await interaction.update(buildClosedTicketPanel());

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 800);

      return;
    }
  },
};