import { Events, ActivityType } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      client.user.setPresence({
        status: "online",
        activities: [
          {
            name: "www.whitecode.pl", // albo "https://whitecode.pages.dev/"
            type: ActivityType.Playing,
          },
        ],
      });

      console.log("✅ Status ustawiony: online + Playing");
    } catch (e) {
      console.error("Status error:", e);
    }
  },
};