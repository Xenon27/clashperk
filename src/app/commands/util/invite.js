const { Command } = require('discord-akairo');

class InviteCommand extends Command {
	constructor() {
		super('invite', {
			aliases: ['invite', 'support'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows bot invite & support server link.' }
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async fetchInvite() {
		if (this.invite) return this.invite;
		const invite = await this.client.generateInvite([
			'CREATE_INSTANT_INVITE',
			'ADD_REACTIONS',
			'VIEW_CHANNEL',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'ATTACH_FILES',
			'READ_MESSAGE_HISTORY',
			'USE_EXTERNAL_EMOJIS',
			'MANAGE_MESSAGES',
			'MANAGE_WEBHOOKS'
		]);

		this.invite = invite;
		return invite;
	}

	async exec(message) {
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`**[Invite Me](${await this.fetchInvite()})**`,
				'**[Official Discord](https://discord.gg/ppuppun)**'
			]);
		return message.util.send({ embed });
	}
}

module.exports = InviteCommand;
