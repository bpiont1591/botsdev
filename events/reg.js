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

/* =========================
   USTAW TUTAJ ID
   ========================= */
const RULES_CHANNEL_ID = "1443727056281276547";
const VERIFIED_ROLE_ID = "1443974036643385526";
const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";

// Twoje custom emoji:
const VERIFY_EMOJI = { id: "1476401105985605824", name: "akcept" };

/* =========================
   PERSIST MESSAGE ID
   ========================= */
const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "rules-compv2-message.json");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}), "utf8");
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
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

/* =========================
   UI HELPERS
   ========================= */
function parseAccentColor(value) {
  if (typeof value === "string") return parseInt(value.replace("#", ""), 16);
  if (typeof value === "number") return value;
  return 0xFFFFFF;
}

// BIAŁY MOTYW dla ephemeral
function buildEphemeralPanel({ title, text, bannerUrl }) {
  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17, // CONTAINER
        accent_color: 0xFFFFFF,
        components: [
          {
            type: 12, // MEDIA GALLERY
            items: [{ media: { url: bannerUrl } }],
          },
          { type: 10, content: `# ${title}` },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: text },
        ],
      },
    ],
  };
}

function buildVerificationMessage({ accentColor, bannerUrl }) {
  const body =
    `Zweryfikuj swoje konto aby uzyskać pełny dostęp do serwera.\n` +
    `Klikając przycisk weryfikacji, wyświetli Ci się okienko z zadaniem.\n` +
    `Po poprawnym rozwiązaniu zadania otrzymasz rolę, która umożliwi korzystanie ze wszystkich kanałów na serwerze.\n` +
    `W razie pytań lub problemów, skontaktuj się z naszym zespołem.`;

  const ctaLine = `Dokończ weryfikację jednym kliknięciem.`;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17, // CONTAINER
        accent_color: accentColor,
        components: [
          {
            type: 12, // MEDIA GALLERY
            items: [{ media: { url: bannerUrl } }],
          },
          { type: 10, content: "# ODBLOKOWANIE DOSTĘPU" },
          { type: 14, divider: true, spacing: 1 },

          { type: 10, content: body },
          { type: 14, divider: true, spacing: 1 },

          // CTA: tekst po lewej + przycisk po prawej
          {
            type: 9, // SECTION
            components: [{ type: 10, content: ctaLine }],
            accessory: {
              type: 2, // BUTTON
              style: 2, // SECONDARY
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

function buildVerifyModal() {
  const modal = new ModalBuilder()
    .setCustomId("verify_modal_submit")
    .setTitle("Weryfikacja");

  const input = new TextInputBuilder()
    .setCustomId("verify_answer")
    .setLabel("Zadanie: ile to jest 2 + 3 ?")
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
        console.warn("⚠️ Ustaw RULES_CHANNEL_ID oraz VERIFIED_ROLE_ID.");
        return;
      }

      const bannerToUse = settings?.rulesBannerUrl || BANNER_URL;

      // zabezpieczenie przed podwójnym listenerem (hot-reload)
      if (!client.__verifyRulesListenerAttached) {
        client.__verifyRulesListenerAttached = true;

        client.on(Events.InteractionCreate, async (interaction) => {
          try {
            // Klik przycisku => pokaż modal
            if (interaction.isButton()) {
              if (!interaction.inGuild()) return;
              if (interaction.customId !== "verify_open_modal") return;

              await interaction.showModal(buildVerifyModal());
              return;
            }

            // Submit modala => sprawdź odpowiedź + nadaj rolę
            if (interaction.isModalSubmit()) {
              if (!interaction.inGuild()) return;
              if (interaction.customId !== "verify_modal_submit") return;

              const answer = interaction.fields.getTextInputValue("verify_answer")?.trim();

              if (answer !== "5") {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPU",
                    text: "Zła odpowiedź. Spróbuj ponownie.",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);
              if (!role) {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPU",
                    text: "Nie mogę znaleźć roli weryfikacji.",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              // uprawnienia bota
              const me = interaction.guild.members.me;
              if (!me) {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPUA",
                    text: "Nie mogę odczytać danych bota na serwerze.",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              if (!me.permissions.has("ManageRoles")) {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPU",
                    text: "Bot nie ma uprawnienia **Zarządzanie rolami** (Manage Roles).",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              // rola bota musi być wyżej niż rola weryfikacji
              if (me.roles.highest.comparePositionTo(role) <= 0) {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPU",
                    text: "Rola bota jest za nisko — ustaw rolę bota **nad** rolą weryfikacji.",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              const member = interaction.member; // GuildMember

              if (member.roles.cache.has(role.id)) {
                await interaction.reply(
                  buildEphemeralPanel({
                    title: "ODBLOKOWANIE DOSTĘPU",
                    text: "Twoje konto jest już zweryfikowane. Posiadasz aktywną rolę weryfikacyjną i pełny dostęp do wszystkich kanałów. Jeśli coś nie działa poprawnie, spróbuj odświeżyć aplikację lub skontaktuj się z administracją.",
                    bannerUrl: bannerToUse,
                  })
                );
                return;
              }

              await member.roles.add(role, "Passed verification task via modal");

              await interaction.reply(
                buildEphemeralPanel({
                  title: "ODBLOKOWANIE DOSTĘPU",
                  text: "Weryfikacja zakończona sukcesem! Możesz już swobodnie korzystać ze wszystkich kanałów.",
                  bannerUrl: bannerToUse,
                })
              );
            }
          } catch (e) {
            console.error("Verification error:", e);
            try {
              const payload = buildEphemeralPanel({
                title: "ODBLOKOWANIE DOSTĘPU",
                text: "Wystąpił błąd podczas weryfikacji. Spróbuj ponownie za chwilę.",
                bannerUrl: bannerToUse,
              });

              if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
              else await interaction.reply(payload);
            } catch {}
          }
        });
      }

      // wysyłka wiadomości (bez duplikatów)
      for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.get(RULES_CHANNEL_ID);
        if (!ch?.isTextBased()) continue;

        const existingId = getSavedMessageId(guild.id);
        if (existingId) {
          const existing = await ch.messages.fetch(existingId).catch(() => null);
          if (existing) continue;
        }

        const accentColor = parseAccentColor(settings?.headerColor);
        const payload = buildVerificationMessage({
          accentColor,
          bannerUrl: bannerToUse,
        });

        const msg = await ch.send(payload);
        setSavedMessageId(guild.id, msg.id);
      }

      console.log("✅ Verification system ready.");
    } catch (error) {
      console.error("verifyRules error:", error);
    }
  },
};