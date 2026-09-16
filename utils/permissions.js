import { PermissionsBitField } from 'discord.js';

const ROLES = {
  TECHNIK: '406217855860867072',
  EVENTMANAGEMENT: '1059523777584705596',
  OFFIZIER: '121534211822714880',
};

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
