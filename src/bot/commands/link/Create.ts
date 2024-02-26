import { APIClan, APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, GuildMember } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';
import { Collections, Settings } from '../../util/Constants.js';

export default class LinkCreateCommand extends Command {
	public constructor() {
		super('link-create', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: ['Links a Player or Clan to a Discord account.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			default: {
				match: 'BOOLEAN'
			},
			user: {
				id: 'member',
				match: 'MEMBER'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { player_tag?: string; clan_tag?: string; member?: GuildMember; default?: boolean; forcePlayer?: boolean }
	) {
		if (!(args.clan_tag || args.player_tag)) {
			const linkButton = new ButtonBuilder()
				.setCustomId(JSON.stringify({ cmd: 'link-add', token_field: 'hidden' }))
				.setLabel('Link account')
				.setEmoji('🔗')
				.setStyle(ButtonStyle.Primary);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton);

			return interaction.editReply({
				content: this.i18n('command.link.no_tag', { lng: interaction.locale }),
				components: [row]
			});
		}

		const member = args.member ?? interaction.member;
		if (member.user.bot) return interaction.editReply(this.i18n('command.link.create.no_bots', { lng: interaction.locale }));

		if (interaction.user.id !== member.user.id) {
			this.client.logger.debug(
				`${interaction.user.username} (${
					interaction.user.id
				}) attempted to link [clan_tag: ${args.clan_tag!}] [player_tag: ${args.player_tag!}] on behalf of ${
					member.user.username
				} (${member.user.id})`,
				{ label: 'LINK' }
			);
		}

		if (args.player_tag) {
			const player = await this.client.resolver.resolvePlayer(interaction, args.player_tag);
			if (!player) return null;
			return this.playerLink(interaction, { player, member, def: Boolean(args.default) });
		}

		if (args.clan_tag) {
			const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
			if (!clan) return null;

			await this.clanLink(member, clan);
			return interaction.editReply(
				this.i18n('command.link.create.success', {
					lng: interaction.locale,
					user: `**${member.user.displayName}**`,
					target: `**${clan.name} (${clan.tag})**`
				})
			);
		}

		return interaction.editReply(this.i18n('command.link.create.fail', { lng: interaction.locale }));
	}

	private async clanLink(member: GuildMember, clan: APIClan) {
		return this.client.db.collection(Collections.USERS).updateOne(
			{ userId: member.id },
			{
				$set: {
					clan: {
						tag: clan.tag,
						name: clan.name
					},
					username: member.user.username,
					displayName: member.user.displayName,
					discriminator: member.user.discriminator,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}

	public async playerLink(
		interaction: CommandInteraction<'cached'>,
		{ player, member, def }: { player: APIPlayer; member: GuildMember; def: boolean }
	) {
		const [doc, accounts] = await this.getPlayer(player.tag, member.id);
		// only owner can set default account
		if (doc && doc.userId === member.id && ((def && member.id !== interaction.user.id) || !def)) {
			await this.resetLinkAPI(member.id, player.tag);
			return interaction.editReply(
				this.i18n('command.link.create.link_exists', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && doc.userId !== member.id) {
			return interaction.editReply(
				this.i18n('command.link.create.already_linked', { lng: interaction.locale, player: `**${player.name} (${player.tag})**` })
			);
		}

		if (doc && accounts.length >= 25) {
			return interaction.editReply(this.i18n('command.link.create.max_limit', { lng: interaction.locale }));
		}

		await this.client.db
			.collection<UserInfoModel>(Collections.USERS)
			.updateOne(
				{ userId: member.id },
				{ $set: { username: member.user.username, displayName: member.user.displayName, discriminator: member.user.discriminator } }
			);

		await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).updateOne(
			{ tag: player.tag },
			{
				$set: {
					userId: member.id,
					username: member.user.username,
					displayName: member.user.displayName,
					discriminator: member.user.discriminator,
					name: player.name,
					tag: player.tag,
					order: def
						? Math.min(0, ...accounts.map((account) => account.order)) - 1
						: Math.min(0, ...accounts.map((account) => account.order)) + 1,
					verified: doc?.verified ?? false,
					updatedAt: new Date()
				},
				$setOnInsert: {
					source: 'bot',
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Fix Conflicts
		await this.resetLinkAPI(member.id, player.tag);
		// Update Role

		if (this.client.settings.get(interaction.guildId, Settings.USE_V2_ROLES_MANAGER, true)) {
			this.client.rolesManager.updateOne(member.id, interaction.guildId);
		}

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		return interaction.editReply(
			this.i18n('command.link.create.success', {
				lng: interaction.locale,
				user: `**${member.user.displayName}**`,
				target: `**${player.name} (${player.tag})**`
			})
		);

		// if (this.client.util.isManager(interaction.member)) {
		// 	const token = this.client.util.createToken({ userId: interaction.user.id, guildId: interaction.guild.id });
		// 	await interaction.followUp({
		// 		content: [
		// 			`**Click the link below to manage Discord links on our Dashboard.**`,
		// 			'',
		// 			`[https://clashperk.com/links](https://clashperk.com/links?token=${token})`
		// 		].join('\n'),
		// 		ephemeral: true
		// 	});

		// this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles
		// }
	}

	private async getPlayer(tag: string, userId: string) {
		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		return Promise.all([collection.findOne({ tag }), collection.find({ userId }).toArray()]);
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
