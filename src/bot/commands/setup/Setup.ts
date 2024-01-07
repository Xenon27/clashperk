import {
	CommandInteraction,
	EmbedBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	ComponentType,
	AttachmentBuilder
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { Flags, Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

const names: Record<string, string> = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed',
	[Flags.LEGEND_LOG]: 'Legend Log',
	[Flags.CAPITAL_LOG]: 'Capital Log',
	[Flags.CHANNEL_LINKED]: 'Linked Channel',
	[Flags.JOIN_LEAVE_LOG]: 'Join/Leave Log'
};

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader',
	everyone: 'Everyone'
};

export default class SetupCommand extends Command {
	public constructor() {
		super('setup', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: 'Enable features or assign clans to channels.'
			}
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			enable: this.handler.modules.get('setup-enable')!,
			disable: this.handler.modules.get('setup-disable')!,
			utility: this.handler.modules.get('setup-utility')!
		}[args.command];
		if (command) {
			return this.handler.continue(interaction, command);
		}

		const CUSTOM_ID = {
			FEATURES: this.client.uuid(interaction.user.id),
			LIST: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(CUSTOM_ID.FEATURES).setStyle(ButtonStyle.Primary).setLabel('Enabled Features'))
			.addComponents(new ButtonBuilder().setCustomId(CUSTOM_ID.LIST).setStyle(ButtonStyle.Primary).setLabel('Clan List'))
			.addComponents(new ButtonBuilder().setURL('https://clashperk.com/guide').setStyle(ButtonStyle.Link).setLabel('Guide'));

		await interaction.deferReply({ ephemeral: true });
		const msg = await interaction.editReply({
			content: ['**Follow the steps below to setup the bot.**'].join('\n'),
			components: [row],
			files: [new AttachmentBuilder('https://i.imgur.com/rEZV66g.png', { name: 'setup.png' })]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.FEATURES) {
				row.components[0].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getFeatures(interaction);
				if (!embeds.length) {
					await action.followUp({
						content: this.i18n('common.no_clans_linked', {
							lng: interaction.locale,
							command: this.client.commands.SETUP_ENABLE
						}),
						ephemeral: true
					});
					return;
				}

				for (const chunks of Util.chunk(embeds, 10)) {
					await action.followUp({ embeds: chunks, ephemeral: true });
				}
			}

			if (action.customId === CUSTOM_ID.LIST) {
				row.components[1].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getClanList(interaction);
				if (!embeds.length) {
					await action.followUp({
						content: this.i18n('common.no_clans_linked', {
							lng: interaction.locale,
							command: this.client.commands.SETUP_ENABLE
						}),
						ephemeral: true
					});
					return;
				}

				await action.followUp({ embeds, ephemeral: true });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(CUSTOM_ID).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async getClanList(interaction: CommandInteraction) {
		const clans = await this.client.storage.find(interaction.guild!.id);
		const clanList = await this.client.http._getClans(clans);
		if (!clans.length) return [];

		// clanList.sort((a, b) => b.members - a.members);
		const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
		const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Clans`, iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				clanList
					.map(
						(clan) =>
							`\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members
								.toString()
								.padStart(2, ' ')}/50 \u200f\``
					)
					.join('\n')
			);

		return [embed];
	}

	private async getFeatures(interaction: CommandInteraction) {
		const clans = await this.client.storage.find(interaction.guild!.id);
		const fetched = await Promise.all(
			clans.map(async (clan) => {
				const [bit1, bit2, bit3, bit4, bit5, bit6, bit7, bit8, bit9] = await Promise.all([
					this.client.db.collection(Collections.DONATION_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.CLAN_FEED_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.LAST_SEEN_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.CLAN_GAMES_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.CLAN_WAR_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.JOIN_LEAVE_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.LEGEND_LOGS).findOne({ clanId: clan._id }),
					this.client.db.collection(Collections.CAPITAL_LOGS).findOne({ clanId: clan._id })
				]);

				return {
					name: clan.name,
					tag: clan.tag,
					color: clan.color,
					alias: clan.alias ? `(${clan.alias}) ` : '',
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					roles: Object.entries(clan.roles ?? {}).map(([role, id]) => {
						const roleMention = interaction.guild!.roles.cache.get(id)?.toString() ?? 'N/A';
						return `${roles[role]}: ${roleMention}`;
					}),
					channels: clan.channels?.map((id) => this.client.channels.cache.get(id)?.toString()) ?? [],
					entries: [
						{
							flag: Flags.DONATION_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit1?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_FEED_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit2?.channel)?.toString()
						},
						{
							flag: Flags.JOIN_LEAVE_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							role: interaction.guild!.roles.cache.get(bit7?.role)?.toString(),
							channel: this.client.channels.cache.get(bit7?.channel)?.toString()
						},
						{
							flag: Flags.LAST_SEEN_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit3?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_EMBED_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit4?.channel)?.toString()
						},
						{
							flag: Flags.LEGEND_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit8?.channel)?.toString()
						},
						{
							flag: Flags.CAPITAL_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit9?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_GAMES_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit5?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_WAR_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit6?.channel)?.toString()
						}
					]
				};
			})
		);

		return fetched.map((clan) => {
			const channels = clan.channels.filter((en) => en);
			const roles = clan.roles.filter((en) => en);
			const features = clan.entries; // .filter(en => en.ok && en.channel);

			const embed = new EmbedBuilder();
			embed.setAuthor({ name: `\u200e${clan.name} (${clan.tag})` });
			if (clan.color) embed.setColor(clan.color);
			if (channels.length) embed.setDescription(channels.join(', '));
			if (roles.length) {
				embed.addFields([{ name: 'Clan Roles', value: roles.join(' '), inline: true }]);
			}
			if (features.length) {
				embed.addFields(
					features.map((en) => ({
						name: names[en.flag],
						value: en.channel ? `${en.channel} ${en.role ?? ''}` : `-`,
						inline: true
					}))
				);
			}
			return embed;
		});
	}
}
