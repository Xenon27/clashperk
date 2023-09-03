import { EmbedBuilder, CommandInteraction, escapeMarkdown, User } from 'discord.js';
import { APIClanWar, APIPlayer } from 'clashofclans.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { BLUE_NUMBERS } from '../../util/Emojis.js';
import { Collections, WarType } from '../../util/Constants.js';
import { ClanGames, Util } from '../../util/index.js';
import { ClanCapitalRaidAttackData, ClanGamesModel } from '../../types/index.js';

export default class RemainingCommand extends Command {
	public constructor() {
		super('remaining', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: [
					'Remaining or Missed Clan War Attacks or Clan Games Points or Capital Raid Attacks.',
					'',
					'Get the War ID from `/warlog` command.'
				]
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; war_id?: number; user?: User; player_tag?: string; type?: string }
	) {
		if ((args.user || args.player_tag) && !interaction.isButton()) {
			const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
			if (args.player_tag && !player) return null;
			return this.forUsers(interaction, { user: args.user, player, type: args.type! });
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (args.war_id) return this.getWar(interaction, args.war_id, clan.tag);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

		if (!clan.isWarLogPublic) {
			const { res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
			if (res.ok) {
				return this.handler.exec(interaction, this.handler.modules.get('cwl-attacks')!, { tag: clan.tag });
			}
			embed.setDescription('Private War Log');
			return interaction.editReply({ embeds: [embed] });
		}

		const { body, res } = await this.client.http.getCurrentWar(clan.tag);
		if (!res.ok) {
			return interaction.editReply('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const { res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
			if (res.ok) {
				return this.handler.exec(interaction, this.handler.modules.get('cwl-attacks')!, { tag: clan.tag });
			}
			embed.setDescription(this.i18n('command.lineup.not_in_war', { lng: interaction.locale }));
			return interaction.editReply({ embeds: [embed] });
		}

		return this.sendResult(interaction, body);
	}

	private async getWar(interaction: CommandInteraction, id: number | string, tag: string) {
		const collection = this.client.db.collection(Collections.CLAN_WARS);
		const data =
			id === 'last'
				? await collection
						.find({
							$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
							warType: { $ne: WarType.CWL },
							state: 'warEnded'
						})
						.sort({ _id: -1 })
						.limit(1)
						.next()
				: await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

		if (!data) {
			return interaction.editReply(this.i18n('command.remaining.no_war_id', { lng: interaction.locale }));
		}

		const clan = data.clan.tag === tag ? data.clan : data.opponent;
		const opponent = data.clan.tag === tag ? data.opponent : data.clan;
		// @ts-expect-error
		return this.sendResult(interaction, { ...data, clan, opponent });
	}

	private sendResult(interaction: CommandInteraction, body: APIClanWar & { id?: number }) {
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		if (body.state === 'preparation') {
			embed.setDescription(
				[
					'**War Against**',
					`${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					'Preparation'
				].join('\n')
			);
			return interaction.editReply({ embeds: [embed] });
		}

		const [OneRem, TwoRem] = [
			body.clan.members.filter((m) => m.attacks && m.attacks.length === 1),
			body.clan.members.filter((m) => !m.attacks)
		];
		const endTime = new Date(moment(body.endTime).toDate()).getTime();

		embed.setDescription(
			[
				'**War Against**',
				`${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				`${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`,
				'',
				'**End Time**',
				`${Util.getRelativeTime(endTime)}`
			].join('\n')
		);
		if (TwoRem.length) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					`**${body.attacksPerMember ?? 2} ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
					...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
				].join('\n')
			);
		}

		if (OneRem.length && body.attacksPerMember !== 1) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					`**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
					...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
				].join('\n')
			);
		}

		if (body.id) embed.setFooter({ text: `War ID #${body.id}` });
		return interaction.editReply({ embeds: [embed] });
	}

	private async forUsers(
		interaction: CommandInteraction<'cached'>,
		{ player, user, type }: { player?: APIPlayer | null; user?: User; type: string }
	) {
		if (type === 'capital-raids') {
			return this.capitalRaids(interaction, { player, user });
		}
		if (type === 'clan-games') {
			return this.clanGames(interaction, { player, user });
		}
		return this.warAttacks(interaction, { player, user });
	}

	private async warAttacks(interaction: CommandInteraction<'cached'>, { player, user }: { player?: APIPlayer | null; user?: User }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.aggregate<APIClanWar>([
				{
					$match: {
						endTime: {
							$gte: new Date()
						},
						$or: [{ 'clan.members.tag': { $in: playerTags } }, { 'opponent.members.tag': { $in: playerTags } }]
					}
				},
				{ $sort: { _id: -1 } }
			])
			.toArray();

		const players = [];
		for (const data of wars) {
			data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
			data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

			for (const tag of playerTags) {
				const __member = data.clan.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				const member =
					__member ?? data.opponent.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				if (!member) continue;

				const clan = __member ? data.clan : data.opponent;
				const attacks = member.attacks ?? [];
				if (attacks.length === data.attacksPerMember) continue;

				players.push({
					member,
					clan,
					attacksPerMember: data.attacksPerMember,
					state: data.state,
					endTime: new Date(data.endTime),
					remaining: (data.attacksPerMember ?? 2) - attacks.length
				});
			}
		}

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Remaining Clan War Attacks');
		if (user && !player) embed.setAuthor({ name: `\u200e${user.displayName} (${user.id})`, iconURL: user.displayAvatarURL() });

		const remaining = players.reduce((a, b) => a + b.remaining, 0);
		players.slice(0, 25).map(({ member, clan, remaining, endTime }, i) => {
			embed.addFields({
				name: `${member.name} (${member.tag})`,
				value: [
					`${remaining} remaining in ${clan.name}`,
					`- ${Util.getRelativeTime(endTime.getTime())}`,
					i === players.length - 1 ? '' : '\u200b'
				].join('\n')
			});
		});
		embed.setFooter({ text: `${remaining} remaining ${Util.plural(remaining, 'attack')}` });

		return interaction.editReply({ embeds: [embed] });
	}

	private async capitalRaids(interaction: CommandInteraction<'cached'>, { player, user }: { player?: APIPlayer | null; user?: User }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);
		const { weekId } = Util.getRaidWeekEndTimestamp();

		const raids = await this.client.db
			.collection(Collections.CAPITAL_RAID_SEASONS)
			.aggregate<ClanCapitalRaidAttackData>([
				{
					$match: { weekId, 'members.tag': { $in: playerTags } }
				}
			])
			.toArray();

		const players = [];
		for (const raid of raids) {
			for (const playerTag of playerTags) {
				const raidMember = raid.members.find((m) => m.tag === playerTag);
				if (!raidMember) continue;
				if (raidMember.attackLimit + raidMember.bonusAttackLimit === raidMember.attacks) continue;

				players.push({
					clan: {
						name: raid.name,
						tag: raid.tag
					},
					member: raidMember,
					remaining: raidMember.attackLimit + raidMember.bonusAttackLimit - raidMember.attacks,
					attackLimit: raidMember.attackLimit + raidMember.bonusAttackLimit,
					endTime: new Date(raid.endDate)
				});
			}
		}

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Remaining Capital Raid Attacks');
		if (user && !player) embed.setAuthor({ name: `\u200e${user.displayName} (${user.id})`, iconURL: user.displayAvatarURL() });

		const remaining = players.reduce((a, b) => a + b.remaining, 0);
		players.slice(0, 25).map(({ member, clan, remaining, endTime }, i) => {
			embed.addFields({
				name: `${member.name} (${member.tag})`,
				value: [
					`${remaining} remaining in ${clan.name}`,
					`- ${Util.getRelativeTime(endTime.getTime())}`,
					i === players.length - 1 ? '' : '\u200b'
				].join('\n')
			});
		});
		embed.setFooter({ text: `${remaining} remaining ${Util.plural(remaining, 'attack')}` });

		return interaction.editReply({ embeds: [embed] });
	}

	private async clanGames(interaction: CommandInteraction<'cached'>, { player, user }: { player?: APIPlayer | null; user?: User }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);

		const members = await this.client.db
			.collection(Collections.CLAN_GAMES_POINTS)
			.aggregate<ClanGamesModel>([
				{
					$match: { season: Util.clanGamesSeasonId(), tag: { $in: playerTags } }
				}
			])
			.toArray();

		const players = [];
		for (const member of members) {
			for (const playerTag of playerTags) {
				if (member.tag !== playerTag) continue;
				if (member.current - member.initial >= ClanGames.MAX_POINT) continue;

				players.push({
					clan: {
						name: member.clans.at(0)!.name,
						tag: member.clans.at(0)!.tag
					},
					member: {
						name: member.name,
						tag: member.tag,
						points: member.current - member.initial
					},
					remaining: ClanGames.MAX_POINT - (member.current - member.initial)
				});
			}
		}

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Remaining Clan Games Points');
		if (user && !player) embed.setAuthor({ name: `\u200e${user.displayName} (${user.id})`, iconURL: user.displayAvatarURL() });

		const remaining = players.reduce((a, b) => a + b.remaining, 0);
		players.slice(0, 25).map(({ member, clan, remaining }, i) => {
			embed.addFields({
				name: `${member.name} (${member.tag})`,
				value: [`${remaining} remaining in ${clan.name}`, i === players.length - 1 ? '' : '\u200b'].join('\n')
			});
		});
		embed.setFooter({ text: `${remaining} remaining ${Util.plural(remaining, 'point')}` });

		return interaction.editReply({ embeds: [embed] });
	}
}
