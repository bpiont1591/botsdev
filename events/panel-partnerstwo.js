import { Events, MessageFlags } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config/appConfig.js";

const PANEL_CHANNEL_ID = appConfig.ids.partnerPanelChannelId || "1476731890026414081";
const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";

// Emotki
const PARTNER_EMOJI = { id: "1476340796331524249", name: "partnerstwo" };
const COPY_EMOJI = { id: "1476759941623840828", name: "reklama" };

// persist panel message id
const DATA_DIR = path.resolve(process.cwd(), "data");
const PANEL_DB_PATH = path.join(DATA_DIR, "partner-panel.json");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PANEL_DB_PATH)) fs.writeFileSync(PANEL_DB_PATH, JSON.stringify({}), "utf8");
}
function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(PANEL_DB_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}
function writeDb(db) {
  ensureDb();
  fs.writeFileSync(PANEL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0xffffff;
}

function buildPartnerPanel({ accentColor, serverName }) {
  const intro =
    `Panel partnerstw **${serverName}**.\n` +
    `Złóż zgłoszenie — każda współpraca podlega ręcznej weryfikacji.\n\n` +
    `**Stawka:** 0,35 zł za zatwierdzone partnerstwo`;

  const rules =
    `**Wymagania**\n` +
    `• Serwer partnera: **min. 100 użytkowników**\n` +
    `• Serwer partnera: **bez treści NSFW**\n` +
    `• Wymagany: **Dowód partnerstwa**\n` +
    `• Spam, duplikaty i próby nadużyć skutkują odrzuceniem\n` +
    `• Każde zgłoszenie jest weryfikowane ręcznie`;

  const payouts =
    `**Wypłaty**\n` +
    `• Realizacja: **w każdy piątek** (1x w tygodniu)\n` +
    `• Minimum: **20,00 zł**\n` +
    `• Metody: **PayPal • Tipply • Revolut • Przelew bankowy**`;

  const footer = `-# Możesz też skopiować gotową reklamę i wkleić ją u partnera.`;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },

          { type: 10, content: `# PARTNERSTWA` },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: intro },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: rules },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: payouts },
          { type: 14, divider: true, spacing: 1 },

          // DWA PRZYCISKI
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                custom_id: "partner_open_modal",
                label: "Zgłoś partnerstwo",
                emoji: PARTNER_EMOJI,
              },
              {
                type: 2,
                style: 2,
                custom_id: "partner_copy_ad",
                label: "Kopiuj reklamę",
                emoji: COPY_EMOJI,
              },
            ],
          },

          { type: 10, content: footer },
        ],
      },
    ],
  };
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client, settings) {
    try {
      const db = readDb();

      const guild = client.guilds.cache.first();
      const serverName = settings?.serverName || guild?.name || "Serwer";

      const ch = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true }).catch(() => null);
      if (!ch?.isTextBased()) {
        console.warn("Kanał panelu partnerstw nie jest tekstowy lub nie istnieje.");
        return;
      }

      // anty-duplikacja wiadomości panelu
      if (db?.messageId) {
        const existing = await ch.messages.fetch(db.messageId).catch(() => null);
        if (existing) return;
      }

      const accentColor = parseAccentColor(settings?.headerColor);
      const msg = await ch.send(buildPartnerPanel({ accentColor, serverName }));

      db.messageId = msg.id;
      db.savedAt = Date.now();
      writeDb(db);

      console.log("✅ Panel partnerstw wysłany.");
    } catch (e) {
      console.error("partner-panel-ready error:", e);
    }
  },
};