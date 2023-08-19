import {
	GuildMember,
	ModalBuilder,
	TextInputStyle,
	ButtonInteraction,
	ModalSubmitInteraction,
	TextInputBuilder,
	ActionRowBuilder,
	DiscordjsError,
	DiscordjsErrorCodes
} from 'discord.js';
import { APIPlayer } from 'clashofclans.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { PlayerLinks, UserInfoModel } from '../../types/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class LinkAddCommand extends Command {
	public constructor() {
		super('link-add', {
			category: 'none',
			channel: 'guild'
		});
	}

	public async exec(interaction: ButtonInteraction<'cached'>, { token_field }: { token_field: string }) {
		if (interaction.isButton()) return this.modal(interaction, token_field);
	}

	private async playerLink(
		interaction: ModalSubmitInteraction<'cached'>,
		{ player, member, def }: { player: APIPlayer; member: GuildMember; def: boolean; token?: string }
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
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Fix Conflicts
		await this.resetLinkAPI(member.id, player.tag);
		// Update Role
		// if (player.clan) this.client.rpcHandler.roleManager.newLink(player);
		if (!accounts.length || def) await this.client.nickHandler.exec(member, player);

		return interaction.editReply(
			this.i18n('command.link.create.success', {
				lng: interaction.locale,
				user: `**${member.user.displayName}**`,
				target: `**${player.name} (${player.tag})**`
			})
		);
	}

	private async modal(interaction: ButtonInteraction<'cached'>, token_field: string) {
		const customIds = {
			modal: this.client.uuid(),
			token: this.client.uuid(),
			tag: this.client.uuid()
		};

		const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Link a Player Account');
		const tagInput = new TextInputBuilder()
			.setCustomId(customIds.tag)
			.setLabel('Player Tag')
			.setPlaceholder('Enter the Player Tag.')
			.setStyle(TextInputStyle.Short)
			.setMaxLength(15)
			.setRequired(true);

		const tokenInput = new TextInputBuilder()
			.setCustomId(customIds.token)
			.setLabel('Player API Token')
			.setPlaceholder('The token can be found in the game settings.')
			.setStyle(TextInputStyle.Short)
			.setMaxLength(15)
			.setRequired(token_field === 'required');

		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput));
		if (token_field !== 'hidden') {
			modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput));
		}

		await interaction.showModal(modal);

		try {
			await interaction
				.awaitModalSubmit({
					time: 10 * 60 * 1000,
					dispose: true,
					filter: (action) => action.customId === customIds.modal
				})
				.then(async (modalSubmit) => {
					const tag = modalSubmit.fields.getTextInputValue(customIds.tag);
					const token = token_field === 'hidden' ? null : modalSubmit.fields.getTextInputValue(customIds.token);
					await modalSubmit.deferReply({ ephemeral: true });

					const { body: data, res } = await this.client.http.getPlayer(tag);
					if (!res.ok) {
						return modalSubmit.editReply({ content: 'Invalid player tag was provided.' });
					}

					if (token) {
						return this.verify(modalSubmit, data, token);
					}

					return this.playerLink(modalSubmit, { player: data, member: interaction.member, def: false });
				});
		} catch (e) {
			if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
				throw e;
			}
		}
	}

	private async verify(interaction: ModalSubmitInteraction<'cached'>, data: APIPlayer, token: string) {
		const { body } = await this.client.http.verifyPlayerToken(data.tag, token);
		if (body.status !== 'ok') {
			return interaction.editReply(this.i18n('command.verify.invalid_token', { lng: interaction.locale }));
		}

		const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		await collection.deleteOne({ userId: { $ne: interaction.user.id }, tag: data.tag });
		const lastAccount = await collection.findOne({ userId: interaction.user.id }, { sort: { order: -1 } });
		await collection.updateOne(
			{ tag: data.tag },
			{
				$set: {
					userId: interaction.user.id,
					username: interaction.user.username,
					displayName: interaction.user.displayName,
					discriminator: interaction.user.discriminator,
					name: data.name,
					tag: data.tag,
					verified: true,
					updatedAt: new Date()
				},
				$setOnInsert: {
					order: lastAccount ? lastAccount.order + 1 : 0,
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		// Rest Link API
		this.resetLinkAPI(interaction.user.id, data.tag);
		// Update Roles
		// if (data.clan) this.client.rpcHandler.roleManager.newLink(data);
		return interaction.editReply(
			this.i18n('command.verify.success', { lng: interaction.locale, info: `${data.name} (${data.tag}) ${EMOJIS.VERIFIED}` })
		);
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
