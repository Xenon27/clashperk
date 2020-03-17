const { Command } = require('discord-akairo');

class GuideCommand extends Command {
	constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			cooldown: 1000,
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows [information](https://guide.clashperk.xyz/) about how to use bot.' }
		});
	}

	async exec(message) {
		return message.util.send('https://guide.clashperk.xyz/');
	}
}

module.exports = GuideCommand;
