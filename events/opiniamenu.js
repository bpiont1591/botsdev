import { Events } from "discord.js";
import fs from "fs";
import path from "path";
import { appConfig } from "../config/appConfig.js";
import { writeJsonAtomic } from "../lib/jsonStore.js";

const settingsPath = path.resolve("./settings.json");

const PANEL_CHANNEL_ID = appConfig.ids.opinionPanelChannelId || "1456964345811439759";

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

async function panelExists(client, messageId) {
  if (!messageId) return false;
  const ch = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true });
  if (!ch?.isTextBased()) return false;
  try {
    const m = await ch.messages.fetch(messageId);
    return !!m;
  } catch {
    return false;
  }
}

// Wysyłka panelu – identyczna jak w interaction, tylko tu też jest, żeby Ready mógł zbudować panel przy starcie.
async function sendOpinionPanel(client) {
  const settings = loadSettings();

  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true });
  if (!panelChannel?.isTextBased()) throw new Error("Kanał panelu nie jest tekstowy!");

  const serverName = settings.serverName || "NAZWAPRO";
  const accentColor =
    typeof settings.headerColor === "string"
      ? parseInt(settings.headerColor.replace("#", ""), 16)
      : settings.headerColor || 0x7289da;

  const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";

  // 5 przycisków ratingu
  const ratingRow = {
    type: 1, // ACTION ROW
    components: [1, 2, 3, 4, 5].map((n) => ({
      type: 2, // BUTTON
      style: 2, // Secondary
      custom_id: `opinia_rate_${n}`,
      label: `${n}`,
      emoji: { name: "⭐" },
    })),
  };

  const sent = await panelChannel.send({
    flags: 1 << 15, // MessageFlags.IsComponentsV2
    components: [
      {
        type: 17, // CONTAINER
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

  // zapisz ID
  settings.panelOpinionMessageId = sent.id;
  writeJsonAtomic(settingsPath, settings);

  return sent;
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log("ClientReady: panel opinii za 5s...");

    setTimeout(async () => {
      try {
        const settings = loadSettings();

        // anty-duplikacja
        if (await panelExists(client, settings.panelOpinionMessageId)) {
          console.log("Panel opinii już istnieje — pomijam.");
          return;
        }

        await sendOpinionPanel(client);
        console.log("Panel opinii wysłany.");
      } catch (e) {
        console.error("Błąd ClientReady(panel):", e);
      }
    }, 5000);
  },
};