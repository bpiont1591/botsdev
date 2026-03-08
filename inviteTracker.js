export function ensureInviteCache(client) {
  if (!client.invitesCache) client.invitesCache = new Map();
}

export async function refreshGuildInvites(client, guild) {
  ensureInviteCache(client);
  if (!guild?.invites?.fetch) return;

  try {
    const invites = await guild.invites.fetch();
    const mapped = new Map(invites.map((invite) => [invite.code, invite.uses ?? 0]));
    client.invitesCache.set(guild.id, mapped);
  } catch (error) {
    console.warn(`[InviteTracker] Nie udało się pobrać zaproszeń dla guild ${guild?.id}:`, error?.message || error);
  }
}
