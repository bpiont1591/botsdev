import { Events, MessageFlags, ButtonBuilder, ButtonStyle } from "discord.js";
import fs from "fs";
import path from "path";

const settingsPath = path.resolve("./settings.json");
const PANEL_CHANNEL_ID = "1443986123079815198";

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

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    setTimeout(async () => {
      try {
        const settings = loadSettings();

        const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID, { force: true });
        if (!panelChannel?.isTextBased()) return;

        // ✅ 1) Anty-spam po resecie: jeśli mamy zapisane ID panelu i wiadomość istnieje — NIE wysyłaj
        if (settings.panelMessageId) {
          try {
            const existing = await panelChannel.messages.fetch(settings.panelMessageId);
            if (existing) return; // panel już jest
          } catch {
            // wiadomość nie istnieje / brak dostępu — lecimy dalej i stworzymy nową
          }
        }

        const accentColor =
          typeof settings.headerColor === "string"
            ? parseInt(settings.headerColor.replace("#", ""), 16)
            : settings.headerColor || 0x7289DA;

        const bannerUrl = "https://i.imgur.com/mW5CIsC.png";

        const sent = await panelChannel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: 17, // CONTAINER
              accent_color: accentColor,
              components: [
                {
                  type: 12, // MEDIA GALLERY
                  items: [
                    { media: { url: bannerUrl } } // ✅ brak description => brak opisu pod banerem
                  ]
                },
                { type: 10, content: "# STWÓRZ ZGŁOSZENIE" },
                { type: 14, divider: true, spacing: 1 },

                {
                  type: 10,
                  content:
                    "Wybierz odpowiednią kategorię, aby utworzyć zgłoszenie i otrzymać wsparcie w konkretnej sprawie. Po wskazaniu tematu Twoje zgłoszenie zostanie przekazane do właściwego zespołu, który niezwłocznie zajmie się jego obsługą i udzieli niezbędnych informacji lub pomoże w rozwiązaniu problemu.\n"
                },
                { type: 14, divider: true, spacing: 1 },

                {
                  type: 1, // ACTION ROW
                  components: [
                    new ButtonBuilder()
                      .setCustomId("ticket_pomoc")
                      .setLabel("POMOC")
                      .setStyle(ButtonStyle.Secondary)
                      .setEmoji({ name: "pomoc", id: "1476339372402933800" }),

                    new ButtonBuilder()
                      .setCustomId("ticket_zakupy")
                      .setLabel("ZAKUPY")
                      .setStyle(ButtonStyle.Secondary)
                      .setEmoji({ name: "sklep", id: "1476339761613639684" }),

                    new ButtonBuilder()
                      .setCustomId("ticket_wspolpraca")
                      .setLabel("WSPÓŁPRACA")
                      .setStyle(ButtonStyle.Secondary)
                      .setEmoji({ name: "partnerstwo", id: "1476340796331524249" }),
                  ]
                }
              ]
            }
          ]
        });

        // ✅ 2) Zapisz ID wysłanej wiadomości, żeby po resecie nie dublować
        settings.panelMessageId = sent.id;
        saveSettings(settings);
      } catch (err) {
        console.error("Błąd przy wysyłaniu panelu:", err);
      }
    }, 5000);
  }
};