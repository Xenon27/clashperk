import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';
import { Collections } from '../../util/Constants';
import { ClanGames } from '../../packages';

interface DBMember {
	tag: string;
	name: string;
	achievements: {
		gained: number;
		name: string;
		value: number;
	}[];
	clanGamesEndTime?: Date;
}

interface Member {
	tag: string;
	name: string;
	points: number;
	endedAt?: Date;
}

export default class ClanGamesCommand extends Command {
	public constructor() {
		super('clangames', {
			aliases: ['points', 'clangames', 'cg'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY'],
			description: {
				content: [
					'Clan Games points of all clan members.',
					'',
					'**[How does it work?](https://clashperk.com/faq#how-does-clan-games-scoreboard-work)**'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--max', '--filter'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const force = yield {
			match: 'flag',
			flag: ['--max']
		};

		const filter = yield {
			match: 'flag',
			flag: ['--filter']
		};

		return { data, force, filter };
	}

	public async exec(message: Message, { data, force, filter }: { data: Clan; force: boolean; filter: boolean }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const memberList = fetched.filter(res => res.ok).map(m => {
			const value = m.achievements.find(a => a.name === 'Games Champion')?.value ?? 0;
			return { tag: m.tag, name: m.name, points: value };
		});

		const queried = await this.query(data.tag, data);
		const { members, total } = this.filter(queried, memberList);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${data.members}/50]`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.filter(d => filter ? d.points > 0 : d.points >= 0)
					.map((m, i) => {
						const points = this.padStart(force ? m.points : Math.min(ClanGames.MAX_POINT, m.points));
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					})
					.join('\n'),
				'```'
			].join('\n'))
			.setFooter(`Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`, this.client.user!.displayAvatarURL());

		return message.util!.send({ embeds: [embed] });
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private get seasonID() {
		const now = new Date();
		if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(clanTag: string, clan: Clan) {
		const cursor = this.client.db.collection(Collections.CLAN_MEMBERS)
			.aggregate([
				{
					$match: {
						clanTag
					}
				},
				{
					$match: {
						season: this.seasonID
					}
				},
				{
					$match: {
						$or: [
							{
								tag: {
									$in: clan.memberList.map(m => m.tag)
								}
							},
							{
								clanGamesTotal: { $gt: 0 }
							}
						]
					}
				},
				{
					$limit: 60
				}
			]);

		return cursor.toArray();
	}

	private filter(dbMembers: DBMember[] = [], clanMembers: Member[] = []) {
		const members = clanMembers.map(member => {
			const mem = dbMembers.find(m => m.tag === member.tag);
			const ach = mem?.achievements.find(m => m.name === 'Games Champion');
			return {
				name: member.name,
				tag: member.tag,
				points: mem ? member.points - ach!.value : 0,
				endedAt: mem?.clanGamesEndTime
			};
		});

		const missingMembers: Member[] = dbMembers.filter(mem => !members.find(m => m.tag === mem.tag))
			.map(mem => ({
				name: mem.name,
				tag: mem.tag,
				points: mem.achievements.find(m => m.name === 'Games Champion')!.gained,
				endedAt: mem.clanGamesEndTime
			}));

		const allMembers = [...members, ...missingMembers];
		const total = allMembers.reduce((prev, mem) => prev + Math.min(mem.points, ClanGames.MAX_POINT), 0);

		return {
			total,
			members: allMembers.sort((a, b) => b.points - a.points)
				.sort((a, b) => {
					if (a.endedAt && b.endedAt) {
						return a.endedAt.getTime() - b.endedAt.getTime();
					}
					return 0;
				})
		};
	}
}
