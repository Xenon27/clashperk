import { AutocompleteInteraction, CommandInteraction, EmbedBuilder, escapeMarkdown, time } from 'discord.js';
import { ObjectId } from 'mongodb';
import { cluster } from 'radash';
import { FlagsEntity } from '../../entities/flags.entity.js';
import { Args, Command } from '../../lib/index.js';
import { Collections, Settings } from '../../util/Constants.js';
import { handlePagination } from '../../util/Pagination.js';

export default class FlagListCommand extends Command {
	public constructor() {
		super('flag-list', {
			category: 'none',
			channel: 'guild',
			description: { content: ['Shows the list of all flagged players.'] },
			defer: true
		});
	}

	public args(): Args {
		return {
			export: {
				match: 'BOOLEAN'
			}
		};
	}

	public autocomplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
		return this.client.autocomplete.flagSearchAutoComplete(interaction, args);
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { flag_type: 'strike' | 'ban'; player_tag?: string; group_by_players?: boolean }
	) {
		// Delete expired flags.
		await this.deleteExpiredFlags(interaction.guildId);

		if (args.player_tag) return this.filterByPlayerTag(interaction, args);

		const groupByPlayers = this.client.settings.get<boolean>(
			interaction.guild.id,
			Settings.FLAG_LIST_GROUP_BY_PLAYERS,
			Boolean(args.group_by_players)
		);
		if (typeof args.group_by_players === 'boolean') {
			this.client.settings.set(interaction.guild.id, Settings.FLAG_LIST_GROUP_BY_PLAYERS, args.group_by_players);
		}

		if (groupByPlayers) return this.groupByPlayerTag(interaction, args);
		return this.flagList(interaction, args);
	}

	public async flagList(
		interaction: CommandInteraction<'cached'>,
		args: { flag_type: 'strike' | 'ban'; player_tag?: string; group_by_players?: boolean }
	) {
		const result = await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.aggregate<FlagsEntity>([
				{
					$match: {
						guild: interaction.guild.id,
						flagType: args.flag_type,
						$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
					}
				},
				{
					$sort: { _id: -1 }
				}
			])
			.toArray();

		if (!result.length) {
			return interaction.editReply(`No Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
		}

		const embeds: EmbedBuilder[] = [];

		cluster(result, 15).forEach((chunk) => {
			const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
			embed.setTitle(`Flags`);
			chunk.forEach((flag, itemIndex) => {
				const reason = `Reason: ${escapeMarkdown(flag.reason.substring(0, 256))}${flag.reason.length > 256 ? '...' : ''}`;
				embed.addFields({
					name: itemIndex === 0 ? `${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List (Total ${result.length})` : '\u200b',
					value: [
						`\u200e[${escapeMarkdown(flag.name)} (${flag.tag})](http://cprk.eu/p/${flag.tag.replace('#', '')})`,
						`Created ${time(flag.createdAt, 'R')}, by ${flag.username}${flag.expiresAt ? `` : ''}`,
						flag.expiresAt ? `Expires on ${time(flag.expiresAt, 'd')}\n${reason}` : `${reason}`
					].join('\n')
				});
			});
			embeds.push(embed);
		});

		return handlePagination(interaction, embeds);
	}

	private async filterByPlayerTag(interaction: CommandInteraction<'cached'>, args: { player_tag?: string; flag_type: 'ban' | 'strike' }) {
		const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
		if (!player) return;

		const flag = await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.aggregate<{
				name: string;
				tag: string;
				user: string;
				count: number;
				flagImpact: number;
				createdAt: Date;
				flags: { reason: string; userId: string; createdAt: Date; _id: ObjectId }[];
			}>([
				{
					$match: {
						guild: interaction.guild.id,
						tag: player.tag,
						flagType: args.flag_type
					}
				},
				{
					$sort: { _id: -1 }
				},
				{
					$group: {
						_id: '$tag',
						flags: {
							$push: {
								_id: '$_id',
								reason: '$reason',
								userId: '$user',
								flagType: '$flagType',
								createdAt: '$createdAt'
							}
						},
						name: { $last: '$name' },
						tag: { $last: '$tag' },
						user: { $last: '$user' },
						createdAt: { $last: '$createdAt' },
						count: { $sum: 1 },
						flagImpact: { $sum: '$flagImpact' }
					}
				}
			])
			.next();

		if (!flag) {
			return interaction.editReply(this.i18n('command.flag.search.not_found', { lng: interaction.locale, tag: player.tag }));
		}

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`)
			.setDescription(
				[
					`[${player.name} (${player.tag})](http://cprk.eu/p/${player.tag.replace('#', '')})`,
					`Flagged by <@${flag.user}>`,
					'',
					`**Flags (Total ${flag.count})**`,
					flag.flags
						.map(
							({ createdAt, reason, _id }) =>
								`${time(createdAt, 'd')} - \`${_id.toHexString().substr(-5).toUpperCase()}\` \n${reason}`
						)
						.join('\n\n')
				].join('\n')
			)
			.setFooter({ text: `Total ${flag.flagImpact} ${args.flag_type}${flag.flagImpact === 1 ? '' : 's'}` });

		return interaction.editReply({ embeds: [embed] });
	}

	private async groupByPlayerTag(interaction: CommandInteraction<'cached'>, args: { flag_type: 'ban' | 'strike' }) {
		const result = await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.aggregate<{
				name: string;
				tag: string;
				user: string;
				count: number;
				flagImpact: number;
				createdAt: Date;
				flags: { reason: string; userId: string; createdAt: Date; _id: ObjectId }[];
			}>([
				{
					$match: {
						guild: interaction.guild.id,
						flagType: args.flag_type
					}
				},
				{
					$sort: { _id: -1 }
				},
				{
					$group: {
						_id: '$tag',
						flags: {
							$push: {
								_id: '$_id',
								reason: '$reason',
								userId: '$user',
								flagType: '$flagType',
								createdAt: '$createdAt'
							}
						},
						name: { $last: '$name' },
						tag: { $last: '$tag' },
						user: { $last: '$user' },
						createdAt: { $last: '$createdAt' },
						count: { $sum: 1 },
						flagImpact: { $sum: '$flagImpact' }
					}
				},
				{
					$sort: {
						flagImpact: -1
					}
				}
			])
			.toArray();

		if (!result.length) {
			return interaction.editReply(`No Flags (${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List)`);
		}

		const embeds: EmbedBuilder[] = [];

		cluster(result, 15).forEach((chunk) => {
			const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
			embed.setTitle(`Flags`);
			chunk.forEach((flag, itemIndex) => {
				embed.addFields({
					name: itemIndex === 0 ? `${args.flag_type === 'strike' ? 'Strike' : 'Ban'} List (Total ${result.length})` : '\u200b',
					value: [
						`\u200e[${escapeMarkdown(flag.name)} (${flag.tag})](http://cprk.eu/p/${flag.tag.replace('#', '')})`,
						`**Total ${flag.count} flag${flag.count === 1 ? '' : 's'}, ${flag.flagImpact} ${args.flag_type}${
							flag.flagImpact === 1 ? '' : 's'
						}**`,
						`**Last ${5} Flags (${flag.count})**`,
						flag.flags
							.slice(0, 5)
							.map(({ createdAt, reason, _id }) => {
								const _reason = reason.substring(0, 100);
								const id = _id.toHexString().substr(-5).toUpperCase();
								return `${time(createdAt, 'd')} - \`${id}\` - ${_reason}`;
							})
							.join('\n')
					].join('\n')
				});
			});
			embeds.push(embed);
		});

		return handlePagination(interaction, embeds);
	}

	private async deleteExpiredFlags(guildId: string) {
		await this.client.db
			.collection<FlagsEntity>(Collections.FLAGS)
			.deleteMany({ guild: guildId, $and: [{ expiresAt: { $lt: new Date() } }] });
	}
}
