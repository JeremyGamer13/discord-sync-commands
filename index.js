const Discord = require('discord.js');

/**
 * @typedef SyncOptions
 * @property {boolean} debug Whether to log actions or not
 * @property {string} guildId Only register commands for a single guild.
 */
/**
 * @typedef SyncResults
 * @property {number} currentCommandCount
 * @property {number} newCommandCount
 * @property {number} deletedCommandCount
 * @property {number} updatedCommandCount
 */
/**
 * @param {Discord.Client} client 
 * @param {[Discord.ApplicationCommandDataResolvable]} commands 
 * @param {SyncOptions} options 
 * @returns {SyncResults}
 */
module.exports = async (client, commands, options = {
    debug: false,
    guildId: null
}) => {

    const log = (message) => options.debug && console.log(message);

    const ready = client.readyAt ? Promise.resolve() : new Promise(resolve => client.once('ready', resolve));
    await ready;

    let currentCommands;
    if (options.guildId) {
        const guild = client.guilds.cache.get(options.guildId);
        if (!guild) throw new Error(`Guild ${options.guildId} not found`);
        currentCommands = await guild.commands.fetch();
    } else {
        currentCommands = await client.application.commands.fetch();
    }

    log(`Synchronizing commands...`);
    log(`Currently ${currentCommands.size} commands.`);

    const newCommands = commands.filter((command) => !currentCommands.some((c) => c.name === command.name));
    for (let newCommand of newCommands) {
        if (options.guildId) {
            await client.guilds.cache.get(options.guildId).commands.create(newCommand);
        } else {
            await client.application.commands.create(newCommand);
        }
    }

    log(`Created ${newCommands.length} commands!`);

    const deletedCommands = currentCommands.filter((command) => !commands.some((c) => c.name === command.name));
    for (let deletedCommand of deletedCommands) {
        await deletedCommand.delete();
    }

    log(`Deleted ${deletedCommands.size} commands!`);

    const updatedCommands = commands.filter((command) => currentCommands.some((c) => c.name === command.name));
    let updatedCommandCount = 0;
    for (let updatedCommand of updatedCommands) {
        const newCommand = updatedCommand;
        const previousCommand = currentCommands.find((c) => c.name === updatedCommand.name);
        let modified = false;
        if (previousCommand.description !== newCommand.description) modified = true;
        if (!Discord.ApplicationCommand.optionsEqual(previousCommand.options ?? [], newCommand.options ?? [])) modified = true;
        if (modified) {
            await previousCommand.edit(newCommand);
            updatedCommandCount++;
        }
    }

    log(`Updated ${updatedCommandCount} commands!`);

    log(`Commands synchronized!`);

    return {
        currentCommandCount: currentCommands.size,
        newCommandCount: newCommands.length,
        deletedCommandCount: deletedCommands.size,
        updatedCommandCount
    };

};
