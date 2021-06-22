import { Message, Util } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import 'moment-duration-format';
import moment from 'moment';
import { EMOJIS } from '../../util/Emojis';
import { Collections } from '@clashperk/node';

// TODO: Fix TS
export default class LastOnlineCommand extends Command {
	public constructor() {
		super('lastonline', {
			aliases: ['lastseen', 'lastonline', 'lo'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'],
			description: {
				content: [
					'Approximate last seen of all clan members.',
					'',
					'**[How does it work?](https://clashperk.com/faq#how-does-last-seen-work)**'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const allowed = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id, tag: data.tag })
			.count();
		if (!allowed && message.guild!.id !== '509784317598105619') {
			return message.util!.send(
				{
					content: '**You must link this clan to a channel to use this command!**',
					files: ['https://cdn.discordapp.com/attachments/752914644779139242/852062721280311327/unknown.png']
				}
			);
		}

		const db = await this.client.db.collection(Collections.LAST_SEEN)
			.find({ 'clan.tag': data.tag })
			.count();
		if (!db) {
			return message.util!.send([
				`Not enough data available for **${data.name} (${data.tag})**`
			].join('\n'));
		}

		const members = await this.aggregationQuery(data);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				'**[Last seen and last 24h activity scores](https://clashperk.com/faq)**',
				`\`\`\`\n\u200eLAST-ON 24H  NAME\n${members
					.map(m => `${m.lastSeen ? this.format(m.lastSeen + 1e3).padEnd(7, ' ') : ''.padEnd(7, ' ')}  ${Math.min(m.count, 99).toString().padStart(2, ' ')}  ${m.name}`)
					.join('\n')}`,
				'```'
			].join('\n'))
			.setFooter(`Members [${data.members}/50]`, message.author.displayAvatarURL());

		const msg = await message.util!.send({ embeds: [embed] });
		await msg.react(EMOJIS.ACTIVITY);
		const { id } = Util.parseEmoji(EMOJIS.ACTIVITY)!;
		const collector = msg.createReactionCollector(
			(reaction, user) => [id].includes(reaction.emoji.id) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.id === id) {
				collector.stop();
				const members = await this.aggregationQuery(data, 30);

				members.sort((a, b) => b.count - a.count);
				embed.setDescription([
					`Clan Member Activities (Last ${30} Days)`,
					`\`\`\`\n\u200e${'TOTAL'.padStart(4, ' ')} AVG  ${'NAME'}\n${members
						.map(m => `${m.count.toString().padEnd(4, ' ')}  ${Math.floor(m.count / 30).toString().padStart(3, ' ')}  ${m.name}`)
						.join('\n')}`,
					'```'
				].join('\n'));
				return msg.edit({ embeds: [embed] });
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private filter(clan: Clan, db: any) {
		if (!db?.members) {
			return clan.memberList.map(m => ({ tag: m.tag, name: m.name, lastSeen: 0, count: 0 }));
		}

		const members = clan.memberList.map(m => {
			const data = db.members.find((d: any) => d.tag === m.tag);
			return {
				tag: m.tag,
				name: m.name,
				count: data ? Number(data.count) : 0,
				lastSeen: data ? new Date().getTime() - new Date(data.lastSeen).getTime() : 0
			};
		});

		members.sort((a, b) => a.lastSeen - b.lastSeen);
		return members.filter(m => m.lastSeen > 0).concat(members.filter(m => m.lastSeen === 0));
	}

	private format(time: number) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}

	private async aggregationQuery(clan: Clan, days = 1) {
		const db = this.client.db.collection(Collections.LAST_SEEN);
		const collection = await db.aggregate([
			{
				$match: {
					// 'clan.tag': clan.tag,
					tag: { $in: [...clan.memberList.map(m => m.tag)] }
				}
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					lastSeen: '$lastSeen',
					entries: {
						$filter: {
							input: '$entries',
							as: 'en',
							cond: {
								$gte: [
									'$$en.entry', new Date(new Date().getTime() - (days * 24 * 60 * 60 * 1000))
								]
							}
						}
					}
				}
			},
			{
				$project: {
					tag: '$tag',
					clan: '$clan',
					lastSeen: '$lastSeen',
					count: {
						$sum: '$entries.count'
					}
				}
			},
			{
				$group: {
					_id: null,
					members: {
						$addToSet: {
							count: '$count',
							tag: '$tag',
							lastSeen: '$lastSeen'
						}
					}
				}
			}
		]).toArray();
		return this.filter(clan, collection[0]);
	}
}
