import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { RaidSeason } from '../../struct/Http.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class SummaryCapitalRaidsCommand extends Command {
	public constructor() {
		super('summary-capital-raids', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { week?: string; clans?: string; clans_only?: boolean; avg_loot?: boolean }
	) {
		const { weekId } = this.raidWeek();
		let { week } = args;
		if (!week) week = weekId;

		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		// const { clansGroup, membersGroup } = week === weekId ? await this.queryFromAPI(clans) : await this.queryFromDB(week, clans);
		const { clansGroup, membersGroup } = await this.queryFromDB(week, clans);

		const maxPad = Math.max(...clansGroup.map((clan) => clan.looted.toString().length));
		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));

		if (args.avg_loot && args.clans_only) {
			embed.setAuthor({ name: `${interaction.guild.name} Capital Raids` });
			embed.setDescription(
				[
					'```',
					`\u200e # ${'LOOT'.padStart(maxPad, ' ')} HIT  AVG NAME`,
					clansGroup
						.map(
							(clan, i) =>
								`${(i + 1).toString().padStart(2, ' ')} ${clan.looted.toFixed(0).padStart(maxPad, ' ')} ${clan.attacks
									.toString()
									.padStart(3, ' ')} ${(clan.looted ? clan.looted / clan.attacks : 0).toFixed(0).padStart(4, ' ')} ${
									clan.name
								}`
						)
						.join('\n'),
					'```'
				].join('\n')
			);
		} else if (args.clans_only) {
			embed.setAuthor({ name: `${interaction.guild.name} Capital Raids` });
			embed.setDescription(
				[
					'```',
					`\u200e # ${'LOOT'.padStart(6, ' ')} HIT MEDAL NAME`,
					clansGroup
						.map(
							(clan, i) =>
								`\u200e${(i + 1).toString().padStart(2, ' ')} ${Util.formatNumber(clan.looted, 1).padStart(
									6,
									' '
								)} ${clan.attacks.toString().padStart(3, ' ')} ${clan.medals.toFixed(0).padStart(5, ' ')} ${clan.name}`
						)
						.join('\n'),
					'```'
				].join('\n')
			);
		} else {
			embed.setAuthor({ name: `${interaction.guild.name} Top Capital Looters` });
			embed.setDescription(
				[
					`**Clan Capital Raids (${week})**`,
					'```',
					'\u200e #   LOOT  HIT  NAME',
					membersGroup
						.map(
							(mem, i) =>
								`\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(mem.capitalResourcesLooted)}  ${
									mem.attacks
								}/${mem.attackLimit}  ${mem.name}`
						)
						.join('\n'),
					'```'
				].join('\n')
			);
		}

		embed.setFooter({ text: `Week ${week}` });

		const payload = {
			cmd: this.id,
			uuid: interaction.id,
			clans: tags.join(','),
			week: args.week,
			clans_only: args.clans_only,
			avg_loot: args.avg_loot
		};

		const customIds = {
			refresh: this.createId(payload),
			avg_loot: this.createId({ ...payload, avg_loot: !args.avg_loot, clans_only: true }),
			toggle: this.createId({ ...payload, clans_only: !args.clans_only })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.toggle)
		);

		if (args.clans_only) {
			row.addComponents(
				new ButtonBuilder()
					.setLabel(args.avg_loot ? 'Loot/Hit/Medals' : 'Avg. Loot/Hit')
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(customIds.avg_loot)
			);
		}

		await interaction.editReply({ embeds: [embed], components: [row] });
		return this.clearId(interaction);
	}

	private async queryFromDB(weekId: string, clans: { tag: string; name: string }[]) {
		const result = await this.client.db
			.collection(Collections.CAPITAL_RAID_SEASONS)
			.aggregate<{
				clans: { name: string; tag: string; attacks: number; looted: number; attackLimit: number; medals: number }[];
				members: { name: string; tag: string; attacks: number; attackLimit: number; capitalResourcesLooted: number }[];
			}>([
				{
					$match: {
						weekId,
						tag: { $in: clans.map((clan) => clan.tag) }
					}
				},
				{
					$facet: {
						clans: [
							{
								$project: {
									name: 1,
									tag: 1,
									looted: {
										$sum: '$members.capitalResourcesLooted'
									},
									attacks: {
										$sum: '$members.attacks'
									},
									attackLimit: {
										$sum: '$members.attackLimit'
									},
									medals: {
										$sum: [{ $multiply: ['$offensiveReward', 6] }, '$defensiveReward']
									}
								}
							},
							{
								$sort: {
									looted: -1
								}
							}
						],
						members: [
							{
								$unwind: {
									path: '$members'
								}
							},
							{
								$replaceRoot: {
									newRoot: '$members'
								}
							},
							{
								$project: {
									name: 1,
									tag: 1,
									attacks: 1,
									attackLimit: {
										$sum: ['$attackLimit', '$bonusAttackLimit']
									},
									capitalResourcesLooted: 1
								}
							},
							{
								$sort: {
									capitalResourcesLooted: -1
								}
							},
							{
								$limit: 99
							}
						]
					}
				}
			])
			.next();
		const clansGroup = result?.clans ?? [];
		const membersGroup = result?.members ?? [];

		return { clansGroup, membersGroup };
	}

	private async queryFromAPI(clans: { tag: string; name: string }[]) {
		const raids = (
			await Promise.all(
				clans.map(async (clan) => {
					const raid = await this.client.http.getCurrentRaidSeason(clan.tag);
					if (raid) return { ...raid, name: clan.name, tag: clan.tag };
					return null;
				})
			)
		).filter((_) => _) as unknown as Required<RaidSeason & { name: string; tag: string }>[];

		const members = raids.map((raid) => raid.members).flat();
		members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);

		return {
			clansGroup: raids
				.reduce<{ name: string; tag: string; attacks: number; looted: number; attackLimit: number }[]>((acc, raid) => {
					const looted = raid.members.reduce((acc, mem) => acc + mem.capitalResourcesLooted, 0);
					const attacks = raid.members.reduce((acc, mem) => acc + mem.attacks, 0);
					const attackLimit = raid.members.reduce((acc, mem) => acc + mem.attackLimit + mem.bonusAttackLimit, 0);

					acc.push({
						name: raid.name,
						tag: raid.tag,
						attacks,
						looted,
						attackLimit
					});
					return acc;
				}, [])
				.sort((a, b) => b.looted - a.looted),
			membersGroup: members.map((mem) => ({ ...mem, attackLimit: mem.attackLimit + mem.bonusAttackLimit })).slice(0, 99)
		};
	}

	private padding(num: number, pad = 5) {
		return num.toString().padStart(pad, ' ');
	}

	private raidWeek() {
		const today = new Date();
		const weekDay = today.getUTCDay();
		const hours = today.getUTCHours();
		const isRaidWeek = (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
		today.setUTCDate(today.getUTCDate() - today.getUTCDay());
		if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
		today.setUTCDate(today.getUTCDate() + 5);
		today.setUTCMinutes(0, 0, 0);
		return { weekDate: today, weekId: today.toISOString().substring(0, 10), isRaidWeek };
	}
}
