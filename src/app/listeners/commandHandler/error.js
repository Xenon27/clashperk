const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const { addBreadcrumb, Severity, captureException } = require('@sentry/node');

class ErrorListener extends Listener {
	constructor() {
		super('error', {
			event: 'error',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	exec(error, message, command) {
		console.log(error);
		const level = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		Logger.error(`${command.id} ~ ${error}`, { level });

		addBreadcrumb({
			message: 'command_errored',
			category: command ? command.category.id : 'inhibitor',
			level: Severity.Error,
			data: {
				user: {
					id: message.author.id,
					username: message.author.tag
				},
				guild: message.guild
					? {
						id: message.guild.id,
						name: message.guild.name
					}
					: null,
				command: command
					? {
						id: command.id,
						aliases: command.aliases,
						category: command.category.id
					}
					: null,
				message: {
					id: message.id,
					content: message.content
				}
			}
		});
		captureException(error);

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			return message.channel.send([
				`${this.client.emojis.get('545968755423838209')} Something went wrong, report us!`,
				`${this.client.emojis.get('609271613740941313')} https://discord.gg/ppuppun`,
				`\`\`\`${error.toString()}\`\`\``
			]);
		}
	}
}

module.exports = ErrorListener;
