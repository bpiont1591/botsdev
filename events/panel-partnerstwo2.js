import {
  Events,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ButtonStyle,
  ButtonBuilder,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";

// Kanały
const ADMIN_CHANNEL_ID = "1476734450548342956"; // log + decyzje admina
const PUBLIC_CHANNEL_ID = "1476732953940852860"; // publikacja reklamy dla wszystkich

const BANNER_URL = "https://i.imgur.com/mW5CIsC.png";

// Emoji do "Zgłoś partnerstwo"
const PARTNER_EMOJI = "<:partnerstwo:1476340796331524249>";

// nagroda: 35 groszy (trzymamy w integerach)
const REWARD_CENTS = 35;

// DB
const DATA_DIR = path.resolve(process.cwd(), "data");
const WALLETS_PATH = path.join(DATA_DIR, "wallets.json");
const REQUESTS_PATH = path.join(DATA_DIR, "partner-requests.json");
const STATS_PATH = path.join(DATA_DIR, "partner-stats.json");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(WALLETS_PATH)) fs.writeFileSync(WALLETS_PATH, JSON.stringify({}), "utf8");
  if (!fs.existsSync(REQUESTS_PATH)) fs.writeFileSync(REQUESTS_PATH, JSON.stringify({}), "utf8");
  if (!fs.existsSync(STATS_PATH))
    fs.writeFileSync(
      STATS_PATH,
      JSON.stringify({ approvedTotal: 0, rejectedTotal: 0, updatedAt: Date.now() }, null, 2),
      "utf8"
    );
}

function readJson(p) {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) || {};
  } catch {
    return {};
  }
}
function writeJson(p, obj) {
  ensureDb();
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function moneyPLN(cents) {
  return (cents / 100).toFixed(2).replace(".", ",") + " zł";
}

// Normalizacja linku do porównywania duplikatów
function normalizeLink(raw) {
  if (!raw) return "";
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[<>]/g, "").replace(/\s+/g, "");
  s = s.replace(/^http:\/\//, "https://");
  s = s.replace(/\/+$/, "");

  s = s
    .replace(/^https:\/\/discord\.com\/invite\//, "https://discord.gg/")
    .replace(/^https:\/\/www\.discord\.com\/invite\//, "https://discord.gg/")
    .replace(/^https:\/\/discordapp\.com\/invite\//, "https://discord.gg/")
    .replace(/^https:\/\/www\.discordapp\.com\/invite\//, "https://discord.gg/")
    .replace(/^https:\/\/www\.discord\.gg\//, "https://discord.gg/");

  return s;
}

function hasManagePerm(interaction) {
  const perms = interaction.member?.permissions;
  return perms?.has?.(PermissionFlagsBits.ManageGuild) || perms?.has?.(PermissionFlagsBits.Administrator);
}

/**
 * Jeśli tworzysz swój "panel użytkownika", użyj tego przycisku.
 * customId MUSI być "partner_open_modal", bo na to nasłuchuje event.
 */
export function buildOpenPartnerButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("partner_open_modal")
      .setStyle(ButtonStyle.Primary)
      .setLabel("Zgłoś partnerstwo")
      // emoji w formie stringa działa w djs v14 dla custom emoji:
      .setEmoji(PARTNER_EMOJI)
  );
}

function buildPartnerModal() {
  const modal = new ModalBuilder().setCustomId("partner_modal_submit").setTitle("Zgłoszenie partnerstwa");

  const name = new TextInputBuilder()
    .setCustomId("partner_name")
    .setLabel("Nazwa partnera / serwera")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(60);

  const link = new TextInputBuilder()
    .setCustomId("partner_link")
    .setLabel("Link do partnera (invite/strona)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const ad = new TextInputBuilder()
    .setCustomId("partner_ad")
    .setLabel("Reklama (krótki opis, max 600)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(600);

  const proof = new TextInputBuilder()
    .setCustomId("partner_proof")
    .setLabel("Dowód partnerstwa (zdjęcia-imgur)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(400);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(link),
    new ActionRowBuilder().addComponents(ad),
    new ActionRowBuilder().addComponents(proof)
  );

  return modal;
}

function buildRejectReasonModal(requestId) {
  const modal = new ModalBuilder()
    .setCustomId(`partner_reject_submit_${requestId}`)
    .setTitle("Odrzucenie partnerstwa");

  const reason = new TextInputBuilder()
    .setCustomId("partner_reject_reason")
    .setLabel("Powód odrzucenia")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(300)
    .setPlaceholder("Np. brak dowodu, duplikat, reklama niezgodna z regulaminem...");

  modal.addComponents(new ActionRowBuilder().addComponents(reason));
  return modal;
}

// Log admina: V2 (jak u Ciebie), ale przy finalu damy components: []
function buildLogMessage({ requestId, userId, userTag, partnerName, partnerLink, adText, proof }) {
  const now = Math.floor(Date.now() / 1000);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xffffff,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },
          { type: 10, content: `# ZGŁOSZENIE PARTNERSTWA` },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              `**ID:** \`${requestId}\`\n` +
              `**Autor:** <@${userId}> (${userTag})\n` +
              `**Data:** <t:${now}:F> (<t:${now}:R>)`,
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              `**Partner:** ${partnerName}\n` +
              `**Link:** ${partnerLink}\n\n` +
              `**Reklama (do publikacji po zatwierdzeniu):**\n${adText}\n\n` +
              `**Dowód:**\n${proof}`,
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Success,
                custom_id: `partner_approve_${requestId}`,
                label: "Zatwierdź (+0,35 zł)",
                emoji: { name: "✅" },
              },
              {
                type: 2,
                style: ButtonStyle.Danger,
                custom_id: `partner_reject_${requestId}`,
                label: "Odrzuć (podaj powód)",
                emoji: { name: "❌" },
              },
            ],
          },
        ],
      },
    ],
  };
}

// FINAL: bez przycisków (components: []) => znikają
function buildFinalLogState({ status, byTag, req }) {
  const now = Math.floor(Date.now() / 1000);
  const isApproved = status === "approved";
  const title = isApproved ? "✅ ZATWIERDZONE" : "❌ ODRZUCONE";

  const reasonBlock = !isApproved
    ? `\n\n**Powód odrzucenia:**\n${req.rejectReason || "Brak (nie podano)"}`
    : "";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xffffff,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },
          { type: 10, content: `# ${title}` },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: `Wykonał: **${byTag}**\nDecyzja: <t:${now}:F> (<t:${now}:R>)` },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              `**ID:** \`${req.id}\`\n` +
              `**Autor:** <@${req.userId}> (${req.userTag})\n\n` +
              `**Partner:** ${req.partnerName}\n` +
              `**Link:** ${req.partnerLink}\n\n` +
              `**Reklama:**\n${req.adText}\n\n` +
              `**Dowód:**\n${req.proof}` +
              reasonBlock,
          },
          // brak action row => brak przycisków
        ],
      },
    ],
  };
}

// Publiczna reklama bez embedów / V2
function buildPublicAdText({ partnerName, partnerLink, adText, authorId }) {
  return (
    `🤝 NOWE PARTNERSTWO\n\n` +
    `Partner: ${partnerName}\n` +
    `Link: ${partnerLink}\n\n` +
    `${adText}\n\n` +
    `Zgłosił: <@${authorId}>`
  );
}

// DM: banner + biało + status + (powód przy rejected)
function buildUserDmMessage({ status, partnerName, partnerLink, rewardText, balanceText, byTag, reason }) {
  const isApproved = status === "approved";
  const title = isApproved ? "✅ PARTNERSTWO ZATWIERDZONE" : "❌ PARTNERSTWO ODRZUCONE";

  const extra = isApproved
    ? `**Nagroda:** ${rewardText}\n**Stan portfela:** ${balanceText}`
    : `**Powód odrzucenia:**\n${reason || "Brak (nie podano)"}`;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: 17,
        accent_color: 0xffffff,
        components: [
          { type: 12, items: [{ media: { url: BANNER_URL } }] },
          { type: 10, content: `# ${title}` },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content:
              `**Partner:** ${partnerName}\n` +
              `**Link:** ${partnerLink}\n\n` +
              `**Decyzję wykonał:** ${byTag}\n\n` +
              `${extra}`,
          },
        ],
      },
    ],
  };
}

async function safeDmUser(client, userId, payload) {
  try {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return false;
    await user.send(payload).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const client = interaction.client;

    try {
      // 1) Klik -> modal zgłoszenia
      if (interaction.isButton() && interaction.customId === "partner_open_modal") {
        await interaction.showModal(buildPartnerModal());
        return;
      }

      // 2) Submit zgłoszenia
      if (interaction.isModalSubmit() && interaction.customId === "partner_modal_submit") {
        // NATYCHMIAST, bo inaczej 10062
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        if (!interaction.inGuild()) {
          await interaction.editReply("❌ Ta akcja działa tylko na serwerze.").catch(() => {});
          return;
        }

        const partnerName = interaction.fields.getTextInputValue("partner_name").trim();
        const partnerLink = interaction.fields.getTextInputValue("partner_link").trim();
        const adText = interaction.fields.getTextInputValue("partner_ad").trim();
        const proof = interaction.fields.getTextInputValue("partner_proof").trim();

        if (!partnerName || !partnerLink || !adText || !proof) {
          await interaction.editReply("❌ Uzupełnij wszystkie pola formularza.").catch(() => {});
          return;
        }

        const requests = readJson(REQUESTS_PATH);
        const normalized = normalizeLink(partnerLink);

        // duplikaty: pending/approved
        const duplicateEntry = Object.values(requests).find((r) => {
          if (!r?.partnerLink) return false;
          const rNorm = normalizeLink(r.partnerLink);
          if (rNorm !== normalized) return false;
          return r.status === "pending" || r.status === "approved";
        });

        if (duplicateEntry) {
          await interaction
            .editReply(
              "⚠️ To wygląda na duplikat.\n" +
                `Ten sam link został już zgłoszony i ma status: **${duplicateEntry.status}**.\n` +
                "Jeśli to pomyłka, zmień link albo zgłoś inną współpracę."
            )
            .catch(() => {});
          return;
        }

        const requestId = `${Date.now()}-${interaction.user.id}`;

        requests[requestId] = {
          id: requestId,
          userId: interaction.user.id,
          userTag: interaction.user.tag,
          guildId: interaction.guildId,
          partnerName,
          partnerLink,
          partnerLinkNormalized: normalized,
          adText,
          proof,
          status: "pending",
          createdAt: Date.now(),
          decidedAt: null,
          decidedBy: null,
          decidedByTag: null,
          rejectReason: null,
          publicAdMessageId: null,
          adminMessageId: null,
        };

        writeJson(REQUESTS_PATH, requests);

        const ch = await client.channels.fetch(ADMIN_CHANNEL_ID, { force: true }).catch(() => null);
        if (!ch?.isTextBased()) {
          await interaction
            .editReply("❌ Kanał panelu admina nie jest dostępny. Skontaktuj się z administracją.")
            .catch(() => {});
          return;
        }

        const sent = await ch
          .send(
            buildLogMessage({
              requestId,
              userId: interaction.user.id,
              userTag: interaction.user.tag,
              partnerName,
              partnerLink,
              adText,
              proof,
            })
          )
          .catch(() => null);

        // zapisz adminMessageId (przyda się do odrzucenia przez modal)
        if (sent?.id) {
          requests[requestId].adminMessageId = sent.id;
          writeJson(REQUESTS_PATH, requests);
        }

        await interaction
          .editReply(
            "✅ Zgłoszenie zostało wysłane do weryfikacji.\n" +
              "Po zatwierdzeniu przez administrację reklama zostanie opublikowana na kanale partnerstw, " +
              "a Ty otrzymasz **0,35 zł** do portfela."
          )
          .catch(() => {});
        return;
      }

      // 3) Klik ODRZUĆ -> zapis adminMessageId + modal
      if (interaction.isButton() && interaction.customId.startsWith("partner_reject_")) {
        if (!interaction.inGuild()) return;

        if (!hasManagePerm(interaction)) {
          await interaction
            .reply({
              content: "❌ Nie masz uprawnień do weryfikacji partnerstw.",
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
          return;
        }

        const requestId = interaction.customId.split("_").slice(2).join("_");
        const requests = readJson(REQUESTS_PATH);
        const req = requests[requestId];

        if (!req) {
          await interaction
            .reply({ content: "❌ Nie mogę znaleźć tego zgłoszenia.", flags: MessageFlags.Ephemeral })
            .catch(() => {});
          return;
        }
        if (req.status !== "pending") {
          await interaction
            .reply({ content: "⚠️ To zgłoszenie zostało już rozpatrzone.", flags: MessageFlags.Ephemeral })
            .catch(() => {});
          return;
        }

        req.adminMessageId = interaction.message?.id ?? req.adminMessageId ?? null;
        requests[requestId] = req;
        writeJson(REQUESTS_PATH, requests);

        await interaction.showModal(buildRejectReasonModal(requestId));
        return;
      }

      // 4) Submit modala odrzucenia -> odrzucenie + DM + edycja loga (bez przycisków)
      if (interaction.isModalSubmit() && interaction.customId.startsWith("partner_reject_submit_")) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        if (!interaction.inGuild()) {
          await interaction.editReply("❌ Ta akcja działa tylko na serwerze.").catch(() => {});
          return;
        }

        if (!hasManagePerm(interaction)) {
          await interaction.editReply("❌ Nie masz uprawnień do weryfikacji partnerstw.").catch(() => {});
          return;
        }

        const requestId = interaction.customId.split("_").slice(3).join("_");
        const reason = interaction.fields.getTextInputValue("partner_reject_reason").trim();

        const requests = readJson(REQUESTS_PATH);
        const req = requests[requestId];

        if (!req) {
          await interaction.editReply("❌ Nie mogę znaleźć tego zgłoszenia.").catch(() => {});
          return;
        }
        if (req.status !== "pending") {
          await interaction.editReply("⚠️ To zgłoszenie zostało już rozpatrzone.").catch(() => {});
          return;
        }

        req.status = "rejected";
        req.decidedAt = Date.now();
        req.decidedBy = interaction.user.id;
        req.decidedByTag = interaction.user.tag;
        req.rejectReason = reason || "Brak (nie podano)";

        const stats = readJson(STATS_PATH);
        stats.rejectedTotal = Number(stats.rejectedTotal || 0) + 1;
        stats.updatedAt = Date.now();
        writeJson(STATS_PATH, stats);

        requests[requestId] = req;
        writeJson(REQUESTS_PATH, requests);

        // DM
        const dmOk = await safeDmUser(
          client,
          req.userId,
          buildUserDmMessage({
            status: "rejected",
            partnerName: req.partnerName,
            partnerLink: req.partnerLink,
            rewardText: moneyPLN(REWARD_CENTS),
            balanceText: "—",
            byTag: interaction.user.tag,
            reason: req.rejectReason,
          })
        );

        // edycja loga (admin message) -> FINAL i BEZ PRZYCISKÓW
        const adminCh = await client.channels.fetch(ADMIN_CHANNEL_ID, { force: true }).catch(() => null);
        if (adminCh?.isTextBased() && req.adminMessageId) {
          const msg = await adminCh.messages.fetch(req.adminMessageId).catch(() => null);
          if (msg) await msg.edit(buildFinalLogState({ status: req.status, byTag: interaction.user.tag, req })).catch(() => {});
        }

        await interaction
          .editReply(
            `❌ Odrzucono zgłoszenie.\n` +
              `📝 Powód zapisany.\n` +
              `📩 DM do użytkownika: ${dmOk ? "wysłano" : "nie można wysłać (DM zablokowane?)"}`
          )
          .catch(() => {});
        return;
      }

      // 5) Klik ZATWIERDŹ -> payout + publikacja + DM + edycja loga (bez przycisków)
      if (interaction.isButton() && interaction.customId.startsWith("partner_approve_")) {
        if (!interaction.inGuild()) return;

        if (!hasManagePerm(interaction)) {
          await interaction
            .reply({
              content: "❌ Nie masz uprawnień do weryfikacji partnerstw.",
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        const requests = readJson(REQUESTS_PATH);
        const requestId = interaction.customId.split("_").slice(2).join("_");
        const req = requests[requestId];

        if (!req) {
          await interaction.editReply("❌ Nie mogę znaleźć tego zgłoszenia.").catch(() => {});
          return;
        }
        if (req.status !== "pending") {
          await interaction.editReply("⚠️ To zgłoszenie zostało już rozpatrzone.").catch(() => {});
          return;
        }

        req.status = "approved";
        req.decidedAt = Date.now();
        req.decidedBy = interaction.user.id;
        req.decidedByTag = interaction.user.tag;
        req.rejectReason = null;

        const wallets = readJson(WALLETS_PATH);
        if (!wallets[req.userId]) {
          wallets[req.userId] = { balanceCents: 0, partnerships: 0, earnedCents: 0, updatedAt: Date.now() };
        }
        wallets[req.userId].balanceCents += REWARD_CENTS;
        wallets[req.userId].earnedCents += REWARD_CENTS;
        wallets[req.userId].partnerships += 1;
        wallets[req.userId].updatedAt = Date.now();
        writeJson(WALLETS_PATH, wallets);

        const stats = readJson(STATS_PATH);
        stats.approvedTotal = Number(stats.approvedTotal || 0) + 1;
        stats.updatedAt = Date.now();
        writeJson(STATS_PATH, stats);

        // publikacja publiczna (zwykły tekst)
        const partnerCh = await client.channels.fetch(PUBLIC_CHANNEL_ID, { force: true }).catch(() => null);
        if (partnerCh?.isTextBased()) {
          const adMsg = await partnerCh
            .send(
              buildPublicAdText({
                partnerName: req.partnerName,
                partnerLink: req.partnerLink,
                adText: req.adText,
                authorId: req.userId,
              })
            )
            .catch(() => null);

          req.publicAdMessageId = adMsg?.id ?? null;

          await partnerCh
            .send(`✅ <@${req.userId}> Partnerstwo zatwierdzone. +${moneyPLN(REWARD_CENTS)} do portfela.`)
            .catch(() => {});
        }

        // DM
        const dmOk = await safeDmUser(
          client,
          req.userId,
          buildUserDmMessage({
            status: "approved",
            partnerName: req.partnerName,
            partnerLink: req.partnerLink,
            rewardText: moneyPLN(REWARD_CENTS),
            balanceText: moneyPLN(wallets[req.userId].balanceCents),
            byTag: interaction.user.tag,
            reason: null,
          })
        );

        // zapisz req
        req.adminMessageId = interaction.message?.id ?? req.adminMessageId ?? null;
        requests[requestId] = req;
        writeJson(REQUESTS_PATH, requests);

        // edycja loga -> FINAL i BEZ PRZYCISKÓW
        await interaction.message
          .edit(buildFinalLogState({ status: req.status, byTag: interaction.user.tag, req }))
          .catch(() => {});

        await interaction
          .editReply(
            `✅ Zatwierdzono.\n` +
              `💰 Użytkownik <@${req.userId}> otrzymał **${moneyPLN(REWARD_CENTS)}**\n` +
              `💳 Stan portfela: **${moneyPLN(wallets[req.userId].balanceCents)}**\n` +
              `🏷️ Zatwierdzone partnerstwa (użytkownik): **${wallets[req.userId].partnerships}**\n` +
              `📈 Zatwierdzone partnerstwa (globalnie): **${stats.approvedTotal}**\n` +
              `📩 DM do użytkownika: ${dmOk ? "wysłano" : "nie można wysłać (DM zablokowane?)"}`
          )
          .catch(() => {});
        return;
      }
    } catch (e) {
      console.error("partner-interactions error:", e);

      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply("❌ Wystąpił błąd. Spróbuj ponownie za chwilę.").catch(() => {});
        } else {
          await interaction
            .reply({ content: "❌ Wystąpił błąd. Spróbuj ponownie za chwilę.", flags: MessageFlags.Ephemeral })
            .catch(() => {});
        }
      }
    }
  },
};