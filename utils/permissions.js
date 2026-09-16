import { PermissionsBitField } from 'discord.js';
import { ROLES } from '../discordIds.js';

const hasRole = (member, role) => member?.roles?.cache?.has(role) ?? false;

function isAdmin(member) {
  return (
    member?.permissions?.has(PermissionsBitField.Flags.ManageGuild) ||
    hasRole(member, ROLES.TECHNIK)
  );
}

function canManageEvents(member) {
  return (
    isAdmin(member) || hasRole(member, ROLES.EVENTMANAGEMENT) || hasRole(member, ROLES.OFFIZIER)
  );
}

export { isAdmin, canManageEvents };
