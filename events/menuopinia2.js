import {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";

const settingsPath = path.resolve("./settings.json");

const PANEL_CHANNEL_ID = "1456964345811439759";
const OPINION_LOG_CHANNEL_ID = "1456964345811439759";

const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";
const WHITE = 0xffffff;

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0x7289da;
}

function stars(n) {
  return "⭐".repeat(n) + "☆".repeat(5 - n);
}

async function deleteOldPanelIfExists(client) {
  const settings = loadSettings();
  if (!settings.panelOpinionMessageId) return;

  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true });
  if (!panelChannel?.isTextBased()) return;

  try {
    const msg = await panelChannel.messages.fetch(settings.panelOpinionMessageId);
    await msg.delete().catch(() => {});
  } catch {
    // już nie istnieje
  }
}

async function sendOpinionPanel(client) {
  const settings = loadSettings();

  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true });
  if (!panelChannel?.isTextBased()) throw new Error("Kanał panelu nie jest tekstowy!");

  const serverName = settings.serverName || "NAZWAPRO";
  const accentColor = parseAccentColor(settings.headerColor);

  const ratingRow = {
    type: 1,
    components: [1, 2, 3, 4, 5].map((n) => ({
      type: 2,
      style: 2,
      custom_id: `opinia_rate_${n}`,
      label: `${n}`,
      emoji: { name: "⭐" },
    })),
  };

  const sent = await panelChannel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },
          { type: 10, content: `# Podziel się opinią o ${serverName}` },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              "Wybierz liczbę gwiazdek (1–5), a potem uzupełnij krótki formularz.\n\n" +
              "**Zasady:**\n" +
              "• bez wulgaryzmów i wycieczek personalnych\n" +
              "• bez ujawniania danych prywatnych\n" +
              "• max **150 znaków**\n",
          },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: "### Oceń i napisz opinię" },
          ratingRow,
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: "Dziękujemy! Każda opinia jest czytana przez administrację.\n" },
        ],
      },
    ],
  });

  settings.panelOpinionMessageId = sent.id;
  saveSettings(settings);
  return sent;
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const client = interaction.client;

    try {
      // 1) Klik w gwiazdkę -> modal
      if (interaction.isButton() && interaction.customId.startsWith("opinia_rate_")) {
        const rating = Number(interaction.customId.split("_").pop());
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

        const modal = new ModalBuilder()
          .setCustomId(`opinia_modal_submit_${rating}`)
          .setTitle(`Opinia • ${rating}/5`);

        // Label krótki, przykłady w placeholder (czytelnie + bez limitowych problemów)
        const inputAtmosfera = new TextInputBuilder()
          .setCustomId("opinia_obsluga")
          .setLabel("Atmosfera współpracy")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(40)
          .setPlaceholder("np. Bardzo dobra / Doskonała / W porządku");

        const inputPrzebieg = new TextInputBuilder()
          .setCustomId("opinia_czas")
          .setLabel("Przebieg wymiany")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(30)
          .setPlaceholder("np. Szybko i sprawnie / Były opóźnienia");

        const inputText = new TextInputBuilder()
          .setCustomId("opinia_tresc")
          .setLabel("Treść (max 150 znaków)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(150)
          .setPlaceholder("Co było OK, a co warto poprawić?");

        modal.addComponents(
          new ActionRowBuilder().addComponents(inputAtmosfera),
          new ActionRowBuilder().addComponents(inputPrzebieg),
          new ActionRowBuilder().addComponents(inputText)
        );

        await interaction.showModal(modal);
        return;
      }

      // 2) Submit modala -> log CompV2 + refresh panel
      if (interaction.isModalSubmit() && interaction.customId.startsWith("opinia_modal_submit_")) {
        const rating = Number(interaction.customId.split("_").pop());
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          await interaction.reply({ content: "Niepoprawna ocena (rating).", flags: MessageFlags.Ephemeral });
          return;
        }

        const atmosfera = interaction.fields.getTextInputValue("opinia_obsluga").trim();
        const przebieg = interaction.fields.getTextInputValue("opinia_czas").trim();
        const text = interaction.fields.getTextInputValue("opinia_tresc").trim();

        if (!text || text.length > 150) {
          await interaction.reply({
            content: "Treść opinii musi mieć 1–150 znaków.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.reply({
          content: `Dzięki! Zapisane: ${stars(rating)} (${rating}/5). 💙`,
          flags: MessageFlags.Ephemeral,
        });

        const logChannel = await client.channels.fetch(OPINION_LOG_CHANNEL_ID, { force: true });
        if (logChannel?.isTextBased()) {
          const unix = Math.floor(Date.now() / 1000);
          const whenFull = `<t:${unix}:F>`;
          const whenRel = `<t:${unix}:R>`;

          const settings = loadSettings();
          const serverName = settings.serverName || interaction.guild?.name || "Serwer";

          await logChannel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [
              {
                type: 17,
                accent_color: WHITE,
                components: [
                  { type: 12, items: [{ media: { url: BANNER_URL } }] },
                  { type: 10, content: `# ${stars(rating)} (${rating}/5)` },
                  { type: 14, divider: true, spacing: 1 },
                  {
                    type: 10,
                    content:
                      `**Autor:** <@${interaction.user.id}> (${interaction.user.tag})\n` +
                      `**Serwer:** ${serverName}\n` +
                      `**Data:** ${whenFull} (${whenRel})`,
                  },
                  { type: 14, divider: true, spacing: 1 },
                  {
                    type: 10,
                    content:
                      `**Atmosfera współpracy:** ${atmosfera || "—"}\n` +
                      `**Przebieg wymiany:** ${przebieg || "—"}`,
                  },
                  { type: 14, divider: true, spacing: 1 },
                  { type: 10, content: `### Treść\n${text || "—"}` },
                ],
              },
            ],
          });
        }

        await deleteOldPanelIfExists(client);
        await sendOpinionPanel(client);
        return;
      }
    } catch (err) {
      console.error("interactionCreate(opinia) error:", err);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: "Ups — coś poszło nie tak. Spróbuj ponownie.", flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  },
};