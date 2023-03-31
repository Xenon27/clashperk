/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { EmbedBuilder, CommandInteraction, ActionRowBuilder, escapeMarkdown, time, ButtonBuilder, ButtonStyle, User } from 'discord.js';
import { Clan, Player } from 'clashofclans.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { attackCounts, Collections, LEGEND_LEAGUE_ID } from '../../util/Constants.js';
import { Args, Command } from '../../lib/index.js';
import { Season, Util } from '../../util/index.js';
import { LegendAttacks, PlayerLinks } from '../../types/index.js';

export default class LegendDaysCommand extends Command {
	public constructor() {
		super('legend-days', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	private getDay(day?: number) {
		if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
		const days = Util.getLegendDays();
		const num = Math.min(days.length, Math.max(day, 1));
		return { ...days[num - 1], day };
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; user?: User; prev?: boolean; day?: number; graph?: boolean }
	) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setEmoji(EMOJIS.REFRESH)
					.setCustomId(JSON.stringify({ cmd: this.id, prev: args.prev, tag: data.tag }))
					.setStyle(ButtonStyle.Secondary)
			)
			.addComponents(
				new ButtonBuilder()
					.setLabel(args.prev ? 'Current Day' : 'Previous Days')
					.setCustomId(JSON.stringify({ cmd: this.id, prev: !args.prev, _: 1, tag: data.tag }))
					.setStyle(args.prev ? ButtonStyle.Success : ButtonStyle.Primary)
			)
			.addComponents(
				new ButtonBuilder()
					.setLabel(args.graph ? 'Overview' : 'View Graph')
					.setCustomId(JSON.stringify({ cmd: this.id, graph: !args.graph, tag: data.tag }))
					.setStyle(ButtonStyle.Secondary)
			);

		if (args.graph) {
			const url = await this.graph(data);
			if (!url) {
				return interaction.followUp({ content: this.i18n('common.no_data', { lng: interaction.locale }), ephemeral: true });
			}
			return interaction.editReply({ content: url, embeds: [], components: [row] });
		}

		const embed = args.prev
			? (await this.logs(data)).setColor(this.client.embed(interaction))
			: (await this.embed(interaction, data, args.day)).setColor(this.client.embed(interaction));

		return interaction.editReply({ embeds: [embed], components: [row], content: null });
	}

	public async getPlayers(userId: string) {
		const players = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId }).toArray();
		const others = await this.client.http.getPlayerTags(userId);
		const playerTagSet = new Set([...players.map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}

	private calc(clanRank: number) {
		if (clanRank >= 41) return 3;
		else if (clanRank >= 31) return 10;
		else if (clanRank >= 21) return 12;
		else if (clanRank >= 11) return 25;
		return 50;
	}

	private async rankings(tag: string) {
		const ranks = await this.client.db
			.collection(Collections.PLAYER_RANKS)
			.aggregate<{ country: string; countryCode: string; players: { rank: number } }>([
				{
					$match: {
						season: Season.ID
					}
				},
				{
					$unwind: {
						path: '$players'
					}
				},
				{
					$match: {
						'players.tag': tag
					}
				}
			])
			.toArray();

		return {
			globalRank: ranks.find(({ countryCode }) => countryCode === 'global')?.players.rank ?? null,
			countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
		};
	}

	private async embed(interaction: CommandInteraction<'cached'>, data: Player, _day?: number) {
		const seasonId = Season.ID;
		const legend = await this.client.db.collection<LegendAttacks>(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });
		const clan = data.clan ? ((await this.client.redis.json.get(`C${data.clan.tag}`)) as Clan | null) : null;

		const { startTime, endTime, day } = this.getDay(_day);
		const logs = (legend?.logs ?? []).filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
		const attacks = logs.filter((en) => en.inc > 0) ?? [];
		const defenses = logs.filter((en) => en.inc <= 0) ?? [];

		const member = (clan?.memberList ?? []).find((en) => en.tag === data.tag);
		const clanRank = member?.clanRank ?? 0;
		const percentage = this.calc(clanRank);

		const [initial] = logs;
		const [current] = logs.slice(-1);

		const attackCount = attacks.length;
		const defenseCount = defenses.length;

		const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
		const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

		const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

		const { globalRank, countryRank } = await this.rankings(data.tag);

		const weaponLevel = data.townHallWeaponLevel ? attackCounts[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
		embed.setDescription(
			[
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
					data.league?.id === LEGEND_LEAGUE_ID ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
				} **${data.trophies}**`,
				''
			].join('\n')
		);

		embed.addFields([
			{
				name: '**Overview**',
				value: [
					`• Initial Trophies: ${initial?.start || data.trophies}`,
					`• Current Trophies: ${current?.end || data.trophies}`,
					` • ${attackCount} attack${attackCount === 1 ? '' : 's'} (+${trophiesFromAttacks} trophies)`,
					` • ${defenseCount} defense${defenseCount === 1 ? '' : 's'} (${trophiesFromDefenses} trophies)`,
					` • ${Math.abs(netTrophies)} trophies ${netTrophies >= 0 ? 'earned' : 'lost'}`
				].join('\n')
			},
			{
				name: '**Ranking**',
				value: [
					`• Global Rank: ${globalRank ?? 'N/A'}`,
					`• Local Rank: ${
						countryRank
							? `${countryRank.players.rank} (${countryRank.country} :flag_${countryRank.countryCode.toLowerCase()}:)`
							: 'N/A'
					}`
				].join('\n')
			}
		]);

		if (clan && member) {
			embed.addFields([
				{
					name: '**Clan**',
					value: [
						`• ${clan ? `${clan.name} (${clan.tag})` : 'N/A'}`,
						`• Rank in Clan: ${member.clanRank}`,
						`• Clan Points Contribution: ${Math.floor((member.trophies * percentage) / 100)} (${percentage}%)`
					].join('\n')
				}
			]);
		}

		embed.addFields([
			{
				name: '**Attacks**',
				value: attacks.length
					? attacks.map((m) => `\` ${`+${m.inc}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			},
			{
				name: '**Defenses**',
				value: defenses.length
					? defenses.map((m) => `\` ${`-${Math.abs(m.inc)}`.padStart(3, ' ')} \` ${time(new Date(m.timestamp), 'R')}`).join('\n')
					: '-',
				inline: true
			}
		]);

		// const seasonId = Util.getLegendDay() === 0 ? Season.previousID : Season.ID;
		embed.setFooter({ text: `Day ${day} (${Season.ID})` });
		return embed;
	}

	private async graph(data: Player) {
		const seasonIds = Array(Math.min(3))
			.fill(0)
			.map((_, m) => {
				const now = new Date(Season.ID);
				now.setHours(0, 0, 0, 0);
				now.setMonth(now.getMonth() - (m - 1), 0);
				return this.getLastMondayOfMonth(now.getMonth(), now.getFullYear());
			})
			.reverse();
		const [, seasonStart, seasonEnd] = seasonIds;

		const result = await this.client.db
			.collection(Collections.LEGEND_ATTACKS)
			.aggregate<{
				_id: string;
				logs: {
					timestamp: Date;
					trophies: string | null;
				}[];
				avgGain: number;
				avgOffense: number;
				avgDefense: number;
			}>([
				{
					$match: {
						tag: data.tag,
						seasonId: {
							$in: seasonIds.map((id) => Season.generateID(id))
						}
					}
				},
				{
					$unwind: {
						path: '$logs'
					}
				},
				{
					$set: {
						ts: {
							$toDate: '$logs.timestamp'
						}
					}
				},
				{
					$set: {
						ts: {
							$dateTrunc: {
								date: '$ts',
								unit: 'day'
							}
						}
					}
				},
				{
					$sort: {
						ts: 1
					}
				},
				{
					$addFields: {
						gain: {
							$subtract: ['$logs.end', '$logs.start']
						},
						offense: {
							$cond: {
								if: {
									$gt: ['$logs.inc', 0]
								},
								then: '$logs.inc',
								else: 0
							}
						},
						defense: {
							$cond: {
								if: {
									$lte: ['$logs.inc', 0]
								},
								then: '$logs.inc',
								else: 0
							}
						}
					}
				},
				{
					$group: {
						_id: '$ts',
						seasonId: {
							$first: '$seasonId'
						},
						trophies: {
							$last: '$logs.end'
						},
						gain: {
							$sum: '$gain'
						},
						offense: {
							$sum: '$offense'
						},
						defense: {
							$sum: '$defense'
						}
					}
				},
				{
					$sort: {
						_id: 1
					}
				},
				{
					$group: {
						_id: '$seasonId',
						logs: {
							$push: {
								timestamp: '$_id',
								trophies: '$trophies'
							}
						},
						avgGain: {
							$avg: '$gain'
						},
						avgDefense: {
							$avg: '$defense'
						},
						avgOffense: {
							$avg: '$offense'
						}
					}
				},
				{
					$sort: {
						_id: -1
					}
				}
			])
			.toArray();
		if (!result.length) return null;

		const season = result.at(0)!;
		// const dates = season.logs.map((log) => moment(log.timestamp));
		// const minDate = moment.min(dates).startOf('day');
		// const maxDate = moment.max(dates).endOf('day');
		const labels = Array.from({ length: moment(seasonEnd).diff(seasonStart, 'days') + 1 }, (_, i) =>
			moment(seasonStart).add(i, 'days').toDate()
		);

		const currentDate = new Date(seasonEnd);
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth();
		const daysInPreviousMonth = new Date(currentYear, currentMonth, 0).getDate();

		result.forEach(({ logs, _id }) => {
			if (_id !== season._id) {
				logs.forEach((log) => {
					const daysToSubtract = daysInPreviousMonth - log.timestamp.getDate();
					const newDate = new Date(currentYear, currentMonth, currentDate.getDate() - daysToSubtract);
					log.timestamp = newDate;
				});
			}
		});

		for (const label of labels) {
			result.forEach(({ logs }) => {
				const log = logs.find((log) => moment(log.timestamp).isSame(label, 'day'));
				if (!log) logs.push({ timestamp: label, trophies: null });
			});

			for (const season of result) {
				season.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			}
		}

		const res = await fetch(`${process.env.ASSET_API_BACKEND!}/legends/graph`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				datasets: result.slice(0, 2),
				labels,
				name: data.name,
				avgNetGain: this.formatNumber(season.avgGain),
				avgOffense: this.formatNumber(season.avgOffense),
				avgDefense: this.formatNumber(season.avgDefense),
				currentTrophies: data.trophies.toFixed(0),
				clanName: data.clan?.name,
				clanBadgeURL: data.clan?.badgeUrls.large,
				season: `${moment(season._id).format('MMMM YYYY')} (${moment(seasonStart).format('DD MMM')} - ${moment(seasonEnd).format(
					'DD MMM'
				)})`
			})
		}).then((res) => res.json());
		return `${process.env.ASSET_API_BACKEND!}/${(res as any).id as string}`;
	}

	private async logs(data: Player) {
		const seasonId = Season.ID;
		const legend = await this.client.db.collection<LegendAttacks>(Collections.LEGEND_ATTACKS).findOne({ tag: data.tag, seasonId });

		const logs = legend?.logs ?? [];

		const days = Util.getLegendDays();

		const perDayLogs = days.reduce<
			{ attackCount: number; defenseCount: number; gain: number; loss: number; final: number; initial: number }[]
		>((prev, { startTime, endTime }) => {
			const mixedLogs = logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
			const attacks = mixedLogs.filter((en) => en.inc > 0) ?? [];
			const defenses = mixedLogs.filter((en) => en.inc <= 0) ?? [];

			const attackCount = attacks.length;
			const defenseCount = defenses.length;
			const [final] = mixedLogs.slice(-1);
			const [initial] = mixedLogs;

			const gain = attacks.reduce((acc, cur) => acc + cur.inc, 0);
			const loss = defenses.reduce((acc, cur) => acc + cur.inc, 0);

			prev.push({ attackCount, defenseCount, gain, loss, final: final?.end ?? '-', initial: initial?.start ?? '-' });
			return prev;
		}, []);

		const weaponLevel = data.townHallWeaponLevel ? attackCounts[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`);
		embed.setDescription(
			[
				...[
					`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${
						data.league?.id === 29000022 ? EMOJIS.LEGEND_LEAGUE : EMOJIS.TROPHY
					} **${data.trophies}**`,
					''
				],
				`**Legend Season Logs (${Season.ID})**`,
				`• ${data.attackWins} ${Util.plural(data.attackWins, 'attack')} and ${data.defenseWins} ${Util.plural(
					data.defenseWins,
					'defense'
				)} won`,
				'',
				'`DAY` `  ATK ` `  DEF ` ` +/- ` ` INIT ` `FINAL `',
				...perDayLogs.map((day, i) => {
					const net = day.gain + day.loss;
					const def = this.pad(`-${Math.abs(day.loss)}${attackCounts[Math.min(9, day.defenseCount)]}`, 5);
					const atk = this.pad(`+${day.gain}${attackCounts[Math.min(9, day.attackCount)]}`, 5);
					const ng = this.pad(`${net > 0 ? '+' : ''}${net}`, 4);
					const final = this.pad(day.final, 4);
					const init = this.pad(day.initial, 5);
					const n = (i + 1).toString().padStart(2, ' ');
					return `\`\u200e${n} \` \`${atk} \` \`${def} \` \`${ng} \` \`${init} \` \` ${final} \``;
				})
			].join('\n')
		);

		const url = await this.graph(data);
		if (url) embed.setImage(url);

		return embed;
	}

	private pad(num: number | string, padding = 4) {
		return num.toString().padStart(padding, ' ');
	}

	private formatNumber(num: number) {
		return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
	}

	private getLastMondayOfMonth(month: number, year: number): Date {
		const lastDayOfMonth = new Date(year, month + 1, 0);
		const lastMonday = new Date(lastDayOfMonth);
		lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
		lastMonday.setHours(5, 0, 0, 0);
		// if (date.getTime() > lastMonday.getTime()) {
		// 	return this.getLastMondayOfMonth(month + 1, year, date);
		// }
		return lastMonday;
	}
}

export interface LogType {
	start: number;
	end: number;
	timestamp: number;
	inc: number;
	type?: string;
}
