import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { Command } from '../../lib/index.js';
import { ClanStore } from '../../struct/StorageHandler.js';
import { Settings } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { category_filter?: 'include' | 'exclude' }) {
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply({
				content: this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			});
		}

		const categories = await this.getCategoriesMap(interaction.guildId);
		const categoryIds = Object.keys(categories);

		const clansReduced = clans.reduce<Record<string, ClanStore[]>>((prev, curr) => {
			let categoryId = curr.categoryId?.toHexString() || 'general';
			if (!(categoryId in categories)) categoryId = 'general';

			prev[categoryId] ??= [];
			prev[categoryId].push(curr);
			return prev;
		}, {});
		const clanGroups = Object.entries(clansReduced).sort(([a], [b]) => categoryIds.indexOf(a) - categoryIds.indexOf(b));

		const embed = new EmbedBuilder()
			.setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
			.setColor(this.client.embed(interaction))
			.setFooter({ text: `Total ${clans.length}` });

		const clanCategoryExclusionList = this.client.settings
			.get<string[]>(interaction.guildId, Settings.CLAN_CATEGORY_EXCLUSION, [])
			.filter((id) => categories[id]);

		if (!args.category_filter && clanCategoryExclusionList.length) args.category_filter = 'exclude';

		const chunk = clanGroups
			.filter(([categoryId]) => {
				if (!args.category_filter || !clanCategoryExclusionList.length) return true;
				if (args.category_filter === 'include') {
					return clanCategoryExclusionList.includes(categoryId);
				}
				return !clanCategoryExclusionList.includes(categoryId);
			})
			.map(([categoryId, clans]) => {
				return [
					`**${categories[categoryId] || 'General'}**`,
					...clans.map((clan) => `[${escapeMarkdown(clan.name)} (${clan.tag})](http://cprk.eu/c/${clan.tag.replace('#', '')})`)
				].join('\n');
			})
			.join('\n\n');

		const [description, ...fields] = Util.splitMessage(chunk, { maxLength: 4096 });
		embed.setDescription(description);

		for (const field of fields) {
			embed.addFields({ name: '\u200b', value: field });
		}

		const payload = {
			cmd: this.id,
			category_filter: args.category_filter === 'exclude' ? 'include' : 'exclude'
		};
		const customId = this.createId({ ...payload });

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(customId)
				.setLabel(args.category_filter === 'exclude' ? 'Secondary' : 'Primary')
				.setStyle(args.category_filter === 'exclude' ? ButtonStyle.Secondary : ButtonStyle.Primary)
		);

		return interaction.editReply({
			embeds: [embed],
			components: args.category_filter && clanCategoryExclusionList.length ? [row] : []
		});
	}

	private async getCategoriesMap(guildId: string) {
		const categories = await this.client.storage.getOrCreateDefaultCategories(guildId);
		return Object.fromEntries(categories.map((cat) => [cat.value, cat.name]));
	}
}
