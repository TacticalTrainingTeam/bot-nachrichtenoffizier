import { PermissionsBitField } from 'discord.js';

const ROLES = {
  TECHNIK: '406217855860867072',
  EVENTMANAGEMENT: '1059523777584705596',
  OFFIZIER: '121534211822714880',
};

function isAdmin(member) {
  return (
    member?.permissions?.has(PermissionsBitField.Flags.ManageGuild) ||
    member?.roles?.cache?.has(ROLES.TECHNIK)
  );
}

function isEventManager(member) {
  return (
    member?.roles?.cache?.has(ROLES.EVENTMANAGEMENT) ||
    member?.roles?.cache?.has(ROLES.OFFIZIER)
  );
}

function canManageEvents(member) {
  return isAdmin(member) || isEventManager(member);
}

export { ROLES, isAdmin, isEventManager, canManageEvents };
