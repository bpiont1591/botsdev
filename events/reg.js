import fs from "node:fs";
import path from "node:path";
import {
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { appConfig } from "../config/appConfig.js";
import { readJsonSafe, writeJsonAtomic } from "../lib/jsonStore.js";

const RULES_CHANNEL_ID = appConfig.ids.rulesChannelId;
const VERIFIED_ROLE_ID = appConfig.ids.verifiedRoleId;
const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";
const VERIFY_EMOJI = { id: "1476401105985605824", name: "akcept" };

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "rules-compv2-message.json");
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) writeJsonAtomic(DB_PATH, {});
}

function readDb() {
  ensureDb();
  return readJsonSafe(DB_PATH, {});
}

function writeDb(db) {
  ensureDb();
  writeJsonAtomic(DB_PATH, db);
}

function getSavedMessageId(guildId) {
  const db = readDb();
  return db?.[guildId]?.messageId ?? null;
}

function setSavedMessageId(guildId, messageId) {
  const db = readDb();
  db[guildId] = { messageId, savedAt: Date.now() };
  writeDb(db);
}

function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0xffffff;
}

function buildEphemeralPanel({ title, text, bannerUrl }) {
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xffffff,
        components: [
          { type: 12, items: [{ media: { url: bannerUrl } }] },
          { type: 10, content: `# ${title}` },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: text },
        ],
      },
    ],
  };
}

function buildVerificationMessage({ accentColor, bannerUrl }) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: [
          { type: 12, items: [{ media: { url: bannerUrl } }] },
          { type: 10, content: "# ODBLOKOWANIE DOSTĘPU" },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              "Zweryfikuj konto, aby uzyskać pełny dostęp. Po kliknięciu przycisku dostaniesz krótkie zadanie matematyczne.",
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 9,
            components: [{ type: 10, content: "Dokończ weryfikację jednym kliknięciem." }],
            accessory: {
              type: 2,
              style: 2,
              custom_id: "verify_open_modal",
              label: "Potwierdź dostęp",
              emoji: VERIFY_EMOJI,
            },
          },
        ],
      },
    ],
  };
}

function makeChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  return { prompt: `Zadanie: ile to jest ${a} + ${b} ?`, answer: String(a + b) };
}

function buildVerifyModal(prompt) {
  const modal = new ModalBuilder().setCustomId("verify_modal_submit").setTitle("Weryfikacja");
  const input = new TextInputBuilder()
    .setCustomId("verify_answer")
    .setLabel(prompt)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("Wpisz wynik...");
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client, settings) {
    try {
      if (!RULES_CHANNEL_ID || !VERIFIED_ROLE_ID) {
        console.warn("⚠️ Brak RULES_CHANNEL_ID lub VERIFIED_ROLE_ID w konfiguracji.");
        return;
      }

      const bannerToUse = settings?.rulesBannerUrl || BANNER_URL;
      client.verifyChallenges ??= new Map();

      if (!client.__verifyRulesListenerAttached) {
        client.__verifyRulesListenerAttached = true;

        client.on(Events.InteractionCreate, async (interaction) => {
          try {
            if (interaction.isButton() && interaction.inGuild() && interaction.customId === "verify_open_modal") {
              const challenge = makeChallenge();
              client.verifyChallenges.set(interaction.user.id, {
                answer: challenge.answer,
                expiresAt: Date.now() + CHALLENGE_TTL_MS,
                tries: 0,
              });
              await interaction.showModal(buildVerifyModal(challenge.prompt));
              return;
            }

            if (!interaction.isModalSubmit() || !interaction.inGuild() || interaction.customId !== "verify_modal_submit") return;

            const state = client.verifyChallenges.get(interaction.user.id);
            if (!state || state.expiresAt < Date.now()) {
              await interaction.reply(
                buildEphemeralPanel({
                  title: "ODBLOKOWANIE DOSTĘPU",
                  text: "Sesja weryfikacji wygasła. Kliknij przycisk ponownie.",
                  bannerUrl: bannerToUse,
                })
              );
              return;
            }

            const answer = interaction.fields.getTextInputValue("verify_answer")?.trim();
            if (answer !== state.answer) {
              state.tries += 1;
              if (state.tries >= 3) client.verifyChallenges.delete(interaction.user.id);
              else client.verifyChallenges.set(interaction.user.id, state);

              await interaction.reply(
                buildEphemeralPanel({
                  title: "ODBLOKOWANIE DOSTĘPU",
                  text: "Zła odpowiedź. Spróbuj ponownie.",
                  bannerUrl: bannerToUse,
                })
              );
              return;
            }

            client.verifyChallenges.delete(interaction.user.id);

            const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);
            if (!role) {
              await interaction.reply(
                buildEphemeralPanel({ title: "ODBLOKOWANIE DOSTĘPU", text: "Nie mogę znaleźć roli weryfikacji.", bannerUrl: bannerToUse })
              );
              return;
            }

            const member = interaction.member;
            if (member.roles.cache.has(role.id)) {
              await interaction.reply(
                buildEphemeralPanel({ title: "ODBLOKOWANIE DOSTĘPU", text: "To konto jest już zweryfikowane.", bannerUrl: bannerToUse })
              );
              return;
            }

            await member.roles.add(role, "Passed verification task via modal");
            await interaction.reply(
              buildEphemeralPanel({
                title: "ODBLOKOWANIE DOSTĘPU",
                text: "Weryfikacja zakończona sukcesem!",
                bannerUrl: bannerToUse,
              })
            );
          } catch (e) {
            console.error("Verification error:", e);
          }
        });
      }

      for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.get(RULES_CHANNEL_ID);
        if (!ch?.isTextBased()) continue;

        const existingId = getSavedMessageId(guild.id);
        if (existingId) {
          const existing = await ch.messages.fetch(existingId).catch(() => null);
          if (existing) continue;
        }

        const msg = await ch.send(
          buildVerificationMessage({ accentColor: parseAccentColor(settings?.headerColor), bannerUrl: bannerToUse })
        );
        setSavedMessageId(guild.id, msg.id);
      }

      console.log("✅ Verification system ready.");
    } catch (error) {
      console.error("verifyRules error:", error);
    }
  },
};
