const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');
const { Util } = require('discord.js');

class CWLMvpCommand extends Command {
	constructor() {
		super('cwlmvp', {
			aliases: ['cwltop', 'cwlmvp'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'Most valuable clan members sorted by CWL stars.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 15000;
	}

	async exec(message, { data }) {
		await message.util.send(`**Making list... ${emoji.loading}**`);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		const memberList = [];
		for (const tag of data.memberList.map(m => m.tag)) {
			const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			}).then(res => res.json());
			const star = member.achievements.find(achievement => achievement.name === 'War League Legend');
			memberList.push({ townHallLevel: member.townHallLevel, name: member.name, cwlStar: star.value });
		}

		const items = this.sort(memberList);
		embed.setDescription([
			'List of most valuable players, sorted by total stars of CWL',
			'',
			`${emoji.townhall}\`» STAR  ${this.padEnd('NAME')}\``,
			items.slice(0, 30)
				.map(member => {
					const name = this.padEnd(member.name);
					const star = this.padStart(member.cwlStar.toString());
					return `${townHallEmoji[member.townHallLevel]}\`» ${star}  ${name}\``;
				})
				.join('\n')
		]);

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.cwlStar - a.cwlStar);
	}

	padStart(msg) {
		return msg.padStart(4, ' ');
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
	}
}

module.exports = CWLMvpCommand;
