// permissions.js
const PermissionsBitField = require('discord.js').PermissionsBitField;

const ROLES = {
    TECHNIK: '406217855860867072',
    EVENTMANAGEMENT: '1059523777584705596',
};

function isAdmin(member) {
    return member?.permissions?.has(PermissionsBitField.Flags.ManageGuild) ||
        member?.roles?.cache?.has(ROLES.TECHNIK);
}

function isEventManager(member) {
    return member?.roles?.cache?.has(ROLES.EVENTMANAGEMENT);
}

function canManageEvents(member) {
    return isAdmin(member) || isEventManager(member);
}

module.exports = {
    ROLES,
    isAdmin,
    isEventManager,
    canManageEvents,
};
