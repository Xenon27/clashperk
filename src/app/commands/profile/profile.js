const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { mongodb } = require('../../struct/Database');
const { emoji, townHallEmoji, heroEmoji } = require('../../util/emojis');

class ProfileCommand extends Command {
	constructor() {
		super('profile', {
			aliases: ['profile', 'whois', 'user'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about your linked accounts.',
				usage: '<member>',
				examples: ['', 'Suvajit', 'Reza', '@gop']
			},
			args: [
				{
					id: 'member',
					type: 'member',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { member }) {
		const data = await this.getProfile(member.id);
		const clanData = await this.getClan(member.id);

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${member.user.tag}`, member.user.displayAvatarURL());

		let index = 0;
		const collection = [];
		if (clanData) {
			const clan = await this.client.coc.clan(clanData.tag).catch(() => null);
			if (clan) {
				collection.push({
					field: `${emoji.clan} [${clan.name} (${clan.tag})](https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)})`,
					values: [`${emoji.empty} Level ${clan.clanLevel}, ${clan.members} Members`]
				});
			}
		}

		if (!data.tags.length) {
			collection.push({
				field: 'No Player accounts are Linked.',
				values: ['Why not add some?']
			});
		}

		for (const tag of data.tags) {
			index += 1;
			const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
				method: 'GET',
				headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
			});
			if (!res.ok) continue;
			const data = await res.json();

			collection.push({
				field: `${townHallEmoji[data.townHallLevel]} [${data.name} (${data.tag})](https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)})`,
				values: [this.heroes(data), this.clanName(data)].filter(a => a.length)
			});

			if (index === 25) break;
		}

		let page = 1;
		const paginated = this.paginate(collection, page);

		embed.setDescription([
			paginated.items.map(({ field, values }) => `${field}\n${values.join('\n')}`).join('\n\n')
		]);
		embed.setFooter(`Page ${paginated.page}/${paginated.maxPage} (${index} accounts)`);
		if (collection.length <= 5) {
			return message.util.send({ embed });
		}

		const msg = await message.util.send({ embed });
		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await msg.edit({
					embed: embed.setFooter(`Page ${this.paginate(collection, page).page}/${paginated.maxPage} (${index} accounts)`)
						.setDescription([
							this.paginate(collection, page).items
								.map(({ field, values }) => `${field}\n${values.join('\n')}`)
								.join('\n\n')
						])
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				await msg.edit({
					embed: embed.setFooter(`Page ${this.paginate(collection, page).page}/${paginated.maxPage} (${index} accounts)`)
						.setDescription([
							this.paginate(collection, page).items
								.map(({ field, values }) => `${field}\n${values.join('\n')}`)
								.join('\n\n')
						])
				});
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	clanName(data) {
		if (!data.clan) return `${emoji.clan} Not in a Clan`;
		const clanRole = data.role.replace(/admin/g, 'Elder')
			.replace(/coLeader/g, 'Co-Leader')
			.replace(/member/g, 'Member')
			.replace(/leader/g, 'Leader');

		return `${emoji.clan} ${clanRole} of ${data.clan.name}`;
	}

	heroes(data) {
		if (!data.heroes) return '';
		return data.heroes.filter(hero => hero.village === 'home')
			.map(hero => `${heroEmoji[hero.name]} ${hero.level}`).join(' ');
	}

	async getProfile(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedusers')
			.findOne({ user: id });

		return data;
	}

	async getClan(id) {
		const data = await mongodb.db('clashperk')
			.collection('linkedclans')
			.findOne({ user: id });

		return data;
	}

	paginate(items, page = 1, pageLength = 5) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
	}
}

module.exports = ProfileCommand;
