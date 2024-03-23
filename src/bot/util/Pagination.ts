import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuInteraction,
	CommandInteraction,
	EmbedBuilder,
	InteractionEditReplyOptions,
	Message,
	RoleSelectMenuInteraction,
	StringSelectMenuInteraction,
	UserSelectMenuInteraction
} from 'discord.js';
import { container } from 'tsyringe';
import Client from '../struct/Client.js';
import { EMOJIS } from './Emojis.js';

const NEXT = '➡️';
const PREV = '⬅️';

export const handlePagination = async (
	interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
	embeds: EmbedBuilder[],
	onExport?: (interaction: ButtonInteraction<'cached'>) => unknown
) => {
	const client = container.resolve(Client);

	const customIds = {
		next: client.uuid(interaction.user.id),
		prev: client.uuid(interaction.user.id),
		export: client.uuid(interaction.user.id)
	};

	const prevButton = new ButtonBuilder()
		.setCustomId(customIds.prev)
		.setEmoji(PREV)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(embeds.length <= 1);

	const nextButton = new ButtonBuilder()
		.setCustomId(customIds.next)
		.setEmoji(NEXT)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(embeds.length <= 1);

	const row = new ActionRowBuilder<ButtonBuilder>();
	const indexButton = new ButtonBuilder()
		.setLabel(`${1}/${embeds.length}`)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true)
		.setCustomId('disabled');

	if (embeds.length > 1) {
		row.addComponents(prevButton);
		row.addComponents(nextButton);
		row.addComponents(indexButton);
	}

	const exportButton = new ButtonBuilder().setCustomId(customIds.export).setEmoji(EMOJIS.EXPORT).setStyle(ButtonStyle.Secondary);
	if (typeof onExport === 'function') row.addComponents(exportButton);

	let index = 0;
	const payload: InteractionEditReplyOptions = {
		embeds: embeds.length ? [embeds[index]] : [],
		components: row.components.length ? [row] : []
	};
	if (!embeds.length) payload.content = '\u200b';
	const msg = await interaction.editReply(payload);

	const collector = msg.createMessageComponentCollector({
		filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
		time: 10 * 60 * 1000
	});

	collector.on('collect', async (action) => {
		if (action.customId === customIds.next) {
			index++;
			if (index >= embeds.length) index = 0;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.prev) {
			index--;
			if (index < 0) index = embeds.length - 1;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.export && action.isButton()) {
			exportButton.setDisabled(true);
			await interaction.editReply({ components: [row] });

			await action.deferReply({ ephemeral: client.commandHandler.isMessagingDisabled(action) });
			await onExport?.(action);
		}
	});

	collector.on('end', async (_, reason) => {
		collector.off('collect', () => null);
		collector.off('end', () => null);
		Object.values(customIds).forEach((id) => client.components.delete(id));
		if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
	});

	return row;
};

export const handleMessagePagination = async (
	interactionUserId: string,
	message: Message,
	embeds: EmbedBuilder[],
	onExport?: (interaction: ButtonInteraction<'cached'>) => unknown
) => {
	const client = container.resolve(Client);

	const customIds = {
		next: client.uuid(interactionUserId),
		prev: client.uuid(interactionUserId),
		export: client.uuid(interactionUserId)
	};

	const prevButton = new ButtonBuilder()
		.setCustomId(customIds.prev)
		.setEmoji(PREV)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(embeds.length <= 1);

	const nextButton = new ButtonBuilder()
		.setCustomId(customIds.next)
		.setEmoji(NEXT)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(embeds.length <= 1);

	const row = new ActionRowBuilder<ButtonBuilder>();
	const indexButton = new ButtonBuilder()
		.setLabel(`${1}/${embeds.length}`)
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true)
		.setCustomId('disabled');

	if (embeds.length > 1) {
		row.addComponents(prevButton);
		row.addComponents(nextButton);
		row.addComponents(indexButton);
	}

	const exportButton = new ButtonBuilder().setCustomId(customIds.export).setEmoji('🖨️').setStyle(ButtonStyle.Secondary);
	if (typeof onExport === 'function' && embeds.length > 1) row.addComponents(exportButton);

	let index = 0;
	const payload: InteractionEditReplyOptions = {
		embeds: embeds.length ? [embeds[index]] : [],
		components: row.components.length ? [row] : []
	};
	if (!embeds.length) payload.content = '\u200b';
	const msg = await message.edit(payload);

	const collector = msg.createMessageComponentCollector({
		filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interactionUserId,
		time: 10 * 60 * 1000
	});

	collector.on('collect', async (action: ButtonInteraction<'cached'>) => {
		if (action.customId === customIds.next) {
			index++;
			if (index >= embeds.length) index = 0;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.prev) {
			index--;
			if (index < 0) index = embeds.length - 1;
			indexButton.setLabel(`${index + 1}/${embeds.length}`);
			await action.update({ embeds: [embeds[index]], components: [row] });
		}

		if (action.customId === customIds.export && action.isButton()) {
			exportButton.setDisabled(true);
			// await message.edit({ components: [] });

			// await action.deferReply({ ephemeral: client.commandHandler.isMessagingDisabled(action) });

			await action.deferUpdate();

			await onExport?.(action);
		}
	});

	collector.on('end', async (_, reason) => {
		collector.off('collect', () => null);
		collector.off('end', () => null);
		Object.values(customIds).forEach((id) => client.components.delete(id));
		if (!/delete/i.test(reason)) await message.edit({ components: [] });
	});

	return row;
};

export const createInteractionCollector = ({
	customIds,
	onClick,
	onSelect,
	onUserSelect,
	onRoleSelect,
	onChannelSelect,
	interaction,
	message,
	clear
}: {
	customIds: Record<string, string>;
	onClick?: (interaction: ButtonInteraction<'cached'>) => unknown;
	onSelect?: (interaction: StringSelectMenuInteraction<'cached'>) => unknown;
	onUserSelect?: (interaction: UserSelectMenuInteraction<'cached'>) => unknown;
	onRoleSelect?: (interaction: RoleSelectMenuInteraction<'cached'>) => unknown;
	onChannelSelect?: (interaction: ChannelSelectMenuInteraction<'cached'>) => unknown;
	interaction: CommandInteraction<'cached'>;
	message: Message<true>;
	clear?: boolean;
}) => {
	const client = container.resolve(Client);

	const collector = message.createMessageComponentCollector({
		time: 10 * 60 * 1000,
		filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id
	});

	collector.on('collect', async (action) => {
		if (action.isButton()) await onClick?.(action);
		if (action.isStringSelectMenu()) await onSelect?.(action);
		if (action.isUserSelectMenu()) await onUserSelect?.(action);
		if (action.isRoleSelectMenu()) await onRoleSelect?.(action);
		if (action.isChannelSelectMenu()) await onChannelSelect?.(action);
	});

	collector.on('end', async (_, reason) => {
		collector.off('collect', () => null);
		collector.off('end', () => null);
		Object.values(customIds).forEach((id) => client.components.delete(id));
		if (!/delete/i.test(reason) && clear) await interaction.editReply({ components: [] });
	});

	return collector;
};
