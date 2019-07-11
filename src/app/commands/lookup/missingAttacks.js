const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');

class MissingAttacksCommand extends Command {
	constructor() {
		super('missing-attacks', {
			aliases: ['missing', 'missing-attacks'],
			category: 'beta',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about missing attacks.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (message, { failure }) => failure.value
					}
				}
			]
		});
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ↗`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setTitle(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`)
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`,
			{
				method: 'GET', headers: {
					Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}`
				}
			}).then(res => res.json());

		if (body.state === 'preparation') {
			embed.setDescription('War has not started yet.');
			return message.util.send({ embed });
		}

		if (body.state === 'notInWar') {
			embed.setDescription('Clan is not in war.');
			return message.util.send({ embed });
		}

		let missing = '';
		for (const member of this.short(body.clan.members)) {
			if (member.attacks && member.attacks.length === 2) continue;
			missing += `**${member.mapPosition}.** ${member.name} ${member.tag} ~ ${member.attacks ? 2 - member.attacks.length : 2} \n`;
		}
		embed.setDescription([
			'**Missing Attacks**',
			'',
			missing
		]);
		const endTime = new Date(moment(body.endTime).toDate()).getTime();
		embed.setFooter(`Ends in ${moment.duration(Date.now() - endTime).format('D [days], H [hours] m [minutes]')}`);

		return message.util.send({ embed });
	}

	short(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}
}

module.exports = MissingAttacksCommand;
