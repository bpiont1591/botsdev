import path from "node:path";
import { readJsonSafe } from "../lib/jsonStore.js";

const settingsPath = path.resolve("./settings.json");
const channelsPath = path.resolve("./channels.json");

const settings = readJsonSafe(settingsPath, {});
const channels = readJsonSafe(channelsPath, {});

export const appConfig = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID || settings.clientId,
    guildId: process.env.DISCORD_GUILD_ID || settings.guildId,
  },
  ids: {
    devId: process.env.DEV_ID || settings.devId,
    konkursChannelId: process.env.KONKURS_CHANNEL_ID || settings.konkursChannelId,
    ticketPanelChannelId: process.env.TICKET_PANEL_CHANNEL_ID || channels.ticketPanelChannel,
    opinionPanelChannelId: process.env.OPINION_PANEL_CHANNEL_ID || settings.opinionPanelChannelId,
    opinionLogChannelId: process.env.OPINION_LOG_CHANNEL_ID || settings.opinionLogChannelId,
    partnerPanelChannelId: process.env.PARTNER_PANEL_CHANNEL_ID || settings.partnerPanelChannelId,
    partnerAdminChannelId: process.env.PARTNER_ADMIN_CHANNEL_ID || settings.partnerAdminChannelId,
    partnerPublicChannelId: process.env.PARTNER_PUBLIC_CHANNEL_ID || settings.partnerPublicChannelId,
    rulesChannelId: process.env.RULES_CHANNEL_ID || channels.verifyChannel,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID || channels.verifiedRoleId,
  },
};

export function requireDiscordToken() {
  if (!appConfig.discord.token) {
    throw new Error("Brak DISCORD_TOKEN w zmiennych środowiskowych.");
  }
  return appConfig.discord.token;
}
