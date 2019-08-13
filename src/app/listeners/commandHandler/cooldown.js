const { Listener } = require('discord-akairo');
const Logger = require('../../util/logger');
const ms = require('ms');

class CooldownListener extends Listener {
	constructor() {
		super('cooldown', {
			event: 'cooldown',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	exec(message, command, remaining) {
		const time = ms(remaining, { long: true });
		const level = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		Logger.log(`=> ${command.id} ~ ${time}`, { level });

		const cooldown = typeof command.cooldown === 'function' ? command.cooldown(message) : command.cooldown;

		if (message.guild ? message.channel.permissionsFor(this.client.user).has('SEND_MESSAGES') : true) {
			const embed = this.client.util.embed()
				.setAuthor('Slow it down!')
				.setColor(0x5970c1)
				.setFooter('ClashPerk Premium')
				.setDescription([
					`You'll be able to use this command again in **${time}**`,
					`The default cooldown is ${ms(cooldown, { long: true })}, but [donators](https://www.patreon.com/bePatron?u=14584309) only need to wait 1 sec!`,
					'',
					'While you wait, go [vote us](https://discordbots.org/bot/526971716711350273/vote) and check out our [Patreon](https://www.patreon.com/bePatron?u=14584309)'
				]);
			return message.channel.send({ embed });
		}
	}
}

module.exports = CooldownListener;
