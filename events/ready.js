import { Events } from "discord.js";
import { ensureInviteCache, refreshGuildInvites } from "../inviteTracker.js";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    ensureInviteCache(client);

    // pobierz invites dla wszystkich serwerów
    for (const guild of client.guilds.cache.values()) {
      await refreshGuildInvites(client, guild);
    }

    console.log(`[InviteTracker] Cache zainicjalizowany dla ${client.guilds.cache.size} guild.`);
  },
};