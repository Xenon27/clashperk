import { Clan, ClanWar, ClanWarLeagueGroup, WarClan } from 'clashofclans.js';
import { AttachmentBuilder, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import moment from 'moment';
import fetch from 'node-fetch';
import { Command } from '../../lib/index.js';
import { Collections, UnrankedWarLeagueId, WarLeagueMap, calculateCWLMedals, promotionMap } from '../../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class CWLStatsCommand extends Command {
	public constructor() {
		super('cwl-stats', {
			category: 'cwl',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Ranking and statistics for each round.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(clan.tag);
			if (cw) return this.rounds(interaction, cw, clan);

			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, body, clan);
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clan: Clan) {
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));
		let [index, stars, destruction] = [0, 0, 0];
		const clanTag = clan.tag;

		const collection: string[][][] = [];
		const members: Record<
			string,
			{
				name: string;
				of: number;
				attacks: number;
				stars: number;
				dest: number;
				lost: number;
			}
		> = {};
		const ranking: Record<
			string,
			{
				name: string;
				tag: string;
				stars: number;
				destruction: number;
				badgeUrl: string;
			}
		> = {};

		const warTags = rounds.map((round) => round.warTags).flat();
		const wars: (ClanWar & { warTag: string })[] = await Promise.all(warTags.map((warTag) => this.fetch(warTag)));

		let activeRounds = 0;

		for (const data of wars) {
			if (!data.ok || data.state === 'notInWar') continue;

			// eslint-disable-next-line
			ranking[data.clan.tag] ??= {
				name: data.clan.name,
				tag: data.clan.tag,
				stars: 0,
				destruction: 0,
				badgeUrl: data.clan.badgeUrls.large
			};
			const clan = ranking[data.clan.tag];
			clan.stars += data.clan.stars;
			if (data.state === 'warEnded' && this.winner(data.clan, data.opponent)) clan.stars += 10;

			clan.destruction += data.clan.destructionPercentage * data.teamSize;

			// eslint-disable-next-line
			ranking[data.opponent.tag] ??= {
				name: data.opponent.name,
				tag: data.opponent.tag,
				stars: 0,
				destruction: 0,
				badgeUrl: data.opponent.badgeUrls.large
			};
			const opponent = ranking[data.opponent.tag];
			opponent.stars += data.opponent.stars;
			if (data.state === 'warEnded' && this.winner(data.opponent, data.clan)) opponent.stars += 10;

			opponent.destruction += data.opponent.destructionPercentage * data.teamSize;

			if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
				const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
				const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
				if (data.state === 'warEnded') {
					stars += this.winner(clan, opponent) ? clan.stars + 10 : clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
					const end = new Date(moment(data.endTime).toDate()).getTime();
					for (const m of clan.members) {
						// eslint-disable-next-line
						members[m.tag] ??= {
							name: m.name,
							of: 0,
							attacks: 0,
							stars: 0,
							dest: 0,
							lost: 0
						};
						const member = members[m.tag];
						member.of += 1;

						if (m.attacks) {
							member.attacks += 1;
							member.stars += m.attacks[0].stars;
							member.dest += m.attacks[0].destructionPercentage;
						}

						if (m.bestOpponentAttack) {
							member.lost += m.bestOpponentAttack.stars;
						}
					}

					collection.push([
						[
							`${this.winner(clan, opponent) ? EMOJIS.OK : EMOJIS.WRONG} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Ended ${moment
								.duration(Date.now() - end)
								.format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						],
						[
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
								opponent.attacks,
								data.teamSize
							).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
								opponent.destructionPercentage
							).padStart(7, ' ')}\``
						]
					]);
				}
				if (data.state === 'inWar') {
					stars += clan.stars;
					destruction += clan.destructionPercentage * data.teamSize;
					const started = new Date(moment(data.startTime).toDate()).getTime();
					for (const m of clan.members) {
						// eslint-disable-next-line
						members[m.tag] ??= {
							name: m.name,
							of: 0,
							attacks: 0,
							stars: 0,
							dest: 0,
							lost: 0
						};

						const member = members[m.tag];
						member.of += 1;

						if (m.attacks) {
							member.attacks += 1;
							member.stars += m.attacks[0].stars;
							member.dest += m.attacks[0].destructionPercentage;
						}

						if (m.bestOpponentAttack) {
							member.lost += m.bestOpponentAttack.stars;
						}
					}

					collection.push([
						[
							`${EMOJIS.LOADING} **${clan.name}** vs **${opponent.name}**`,
							`${EMOJIS.CLOCK} [Round ${++index}] Started ${moment
								.duration(Date.now() - started)
								.format('D[d], H[h] m[m]', { trim: 'both mid' })} ago`
						],
						[
							`\`${clan.stars.toString().padEnd(10, ' ')} Stars ${opponent.stars.toString().padStart(10, ' ')}\``,
							`\`${this.attacks(clan.attacks, data.teamSize).padEnd(9, ' ')} Attacks ${this.attacks(
								opponent.attacks,
								data.teamSize
							).padStart(9, ' ')}\``,
							`\`${this.destruction(clan.destructionPercentage).padEnd(7, ' ')} Destruction ${this.destruction(
								opponent.destructionPercentage
							).padStart(7, ' ')}\``
						]
					]);
				}

				if (['inWar', 'warEnded'].includes(data.state)) activeRounds += 1;
			}
		}

		if (!collection.length && body.season !== Util.getCWLSeasonId()) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}
		if (!collection.length) return interaction.editReply(this.i18n('command.cwl.no_rounds', { lng: interaction.locale }));
		const description = collection
			.map((arr) => {
				const header = arr[0].join('\n');
				const description = arr[1].join('\n');
				return [header, description].join('\n');
			})
			.join('\n\n');

		const _clans =
			(body.state as unknown as string) === 'ended'
				? []
				: (await Promise.all(body.clans.map((c) => this.client.http.clan(c.tag)))).filter((c) => c.ok);
		const leaguesMap = _clans.reduce<Record<string, number>>((a, b) => {
			a[b.tag] = b.warLeague?.id ?? UnrankedWarLeagueId;
			return a;
		}, {});

		const lg = await this.client.db.collection(Collections.CWL_GROUPS).findOne({ 'season': body.season, 'clans.tag': clan.tag });
		const leagueId = lg?.leagues?.[clan.tag] ?? leaguesMap[clan.tag];

		const ranks = Object.values(ranking)
			.sort(this.rankingSort)
			.map((clan, i) => ({ ...clan, leagueId, rank: i + 1 }))
			.map((clan) => ({
				...clan,
				pos: leagueId
					? clan.rank <= promotionMap[leagueId].promotion
						? 'up'
						: clan.rank >= promotionMap[leagueId].demotion
						? 'down'
						: 'same'
					: 0,
				destruction: Math.round(clan.destruction)
			}));

		const rankIndex = ranks.findIndex((a) => a.tag === clanTag);
		const padding = Math.max(...ranks.map((r) => r.destruction)) > 9999 ? 6 : 5;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const maxStars =
			Object.values(members)
				.sort((a, b) => b.stars - a.stars)
				.sort((a, b) => b.dest - a.dest)
				.at(0)?.stars ?? 0;

		const embeds = [
			new EmbedBuilder()
				.setColor(this.client.embed(interaction))
				.setTitle(`Clan War League Stats (${body.season})`)
				.setDescription(description)
		];
		const embed = new EmbedBuilder().setColor(this.client.embed(interaction)).setTitle('Clan War League Ranking');

		if (leagueId) {
			embed.setDescription(
				[
					`${EMOJIS.GAP}${EMOJIS.HASH} **\`\u200eSTAR DEST%${''.padEnd(padding - 3, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
					ranks
						.map((clan) => {
							const emoji =
								clan.rank <= promotionMap[leagueId].promotion
									? EMOJIS.UP_KEY
									: clan.rank >= promotionMap[leagueId].demotion
									? EMOJIS.DOWN_KEY
									: EMOJIS.STAYED_SAME;

							return `${emoji}${BLUE_NUMBERS[clan.rank]} \`\u200e ${clan.stars.toString().padEnd(3, ' ')} ${this.dest(
								clan.destruction,
								padding
							)}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\``;
						})
						.join('\n'),
					'',
					`Rank #${rankIndex + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}% ${
						EMOJIS.CWL_MEDAL
					} (Max. ${calculateCWLMedals(leagueId, 8, rankIndex + 1)})`
				].join('\n')
			);
		} else {
			embed.setDescription(
				[
					`${EMOJIS.HASH} **\`\u200eSTAR DEST%${''.padEnd(padding - 3, ' ')}${'NAME'.padEnd(15, ' ')}\`**`,
					ranks
						.map((clan, i) => {
							return `${BLUE_NUMBERS[++i]} \`\u200e ${clan.stars.toString().padEnd(3, ' ')} ${this.dest(
								clan.destruction,
								padding
							)}  ${Util.escapeBackTick(clan.name).padEnd(15, ' ')}\``;
						})
						.join('\n'),
					'',
					`Rank #${rankIndex + 1} ${EMOJIS.STAR} ${stars} ${EMOJIS.DESTRUCTION} ${destruction.toFixed()}%`
				].join('\n')
			);
		}

		await interaction.editReply({ embeds: [...embeds, embed] });
		if (!leagueId) return null;

		const arrayBuffer = await fetch(`${process.env.ASSET_API_BACKEND!}/wars/cwl-ranks`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				ranks,
				rankIndex: rankIndex,
				season: body.season,
				leagueName: WarLeagueMap[leagueId],
				rounds: `${activeRounds}/${body.rounds.length}`
			})
		}).then((res) => res.arrayBuffer());

		const rawFile = new AttachmentBuilder(Buffer.from(arrayBuffer), {
			name: 'clan-war-league-ranking.jpeg'
		});
		embed.setImage('attachment://clan-war-league-ranking.jpeg');
		return interaction.editReply({ files: [rawFile], embeds: [...embeds, embed] });
	}

	private async fetch(warTag: string) {
		const data = await this.client.http.clanWarLeagueWar(warTag);
		return { warTag, ...data };
	}

	private dest(dest: number, padding: number) {
		return dest.toFixed().toString().concat('%').padEnd(padding, ' ');
	}

	private destruction(dest: number) {
		return dest.toFixed(2).toString().concat('%');
	}

	private attacks(num: number, team: number) {
		return num.toString().concat(`/${team}`);
	}

	private winner(clan: WarClan, opponent: WarClan) {
		return this.client.http.isWinner(clan, opponent);
	}

	private rankingSort(a: { stars: number; destruction: number }, b: { stars: number; destruction: number }) {
		if (a.stars === b.stars) return b.destruction - a.destruction;
		return b.stars - a.stars;
	}
}
