import {
	EmbedBuilder,
	CommandInteraction,
	StringSelectMenuBuilder,
	ActionRowBuilder,
	User,
	embedLength,
	ButtonStyle,
	ButtonBuilder,
	ButtonInteraction
} from 'discord.js';
import { APIPlayer } from 'clashofclans.js';
import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis.js';
import RAW_TROOPS_DATA from '../../util/Troops.js';
import { Args, Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { TroopJSON } from '../../types/index.js';
import { getMenuFromMessage } from '../../util/Helper.js';

export const EN_ESCAPE = '\u2002';

export const resourceMap = {
	'Elixir': EMOJIS.ELIXIR,
	'Dark Elixir': EMOJIS.DARK_ELIXIR,
	'Gold': EMOJIS.GOLD,
	'Builder Elixir': EMOJIS.BUILDER_ELIXIR,
	'Builder Gold': EMOJIS.BUILDER_GOLD
};

export default class UpgradesCommand extends Command {
	public constructor() {
		super('upgrades', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Remaining upgrades of troops, spells and heroes.'
			},
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

	public async exec(interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const embed = this.embed(data).setColor(this.client.embed(interaction));
		if (!interaction.isMessageComponent()) await interaction.editReply({ embeds: [embed] });

		const payload = {
			cmd: this.id,
			tag: data.tag
		};

		const customIds = {
			accounts: JSON.stringify({ ...payload, string_key: 'tag' }),
			refresh: JSON.stringify({ ...payload }),
			units: JSON.stringify({ ...payload, cmd: 'units' }),
			player: JSON.stringify({ ...payload, cmd: 'player' }),
			rushed: JSON.stringify({ ...payload, cmd: 'rushed' })
		};

		const refreshButton = new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh);
		const mainRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(refreshButton)
			.addComponents(new ButtonBuilder().setLabel('Units').setStyle(ButtonStyle.Primary).setCustomId(customIds.units))
			.addComponents(new ButtonBuilder().setLabel('Profile').setStyle(ButtonStyle.Secondary).setCustomId(customIds.player))
			.addComponents(new ButtonBuilder().setLabel('Rushed').setStyle(ButtonStyle.Primary).setCustomId(customIds.rushed));

		if (interaction.isMessageComponent()) {
			return interaction.editReply({
				embeds: [embed],
				components: [mainRow, ...getMenuFromMessage(interaction, data.tag, customIds.accounts)]
			});
		}

		const players = data.user ? await this.client.resolver.getPlayers(data.user.id) : [];
		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			default: op.tag === data.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId(customIds.accounts).setPlaceholder('Select an account!').addOptions(options)
		);

		return interaction.editReply({ embeds: [embed], components: options.length > 1 ? [mainRow, menuRow] : [mainRow] });
	}

	public embed(data: APIPlayer) {
		const embed = new EmbedBuilder()
			.setAuthor({ name: `${data.name} (${data.tag})` })
			.setDescription(
				[
					`Remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? `& BH ${data.builderHallLevel}` : ''}`,
					'Total time & cost of the remaining units',
					'for the current TH/BH level.',
					'R = Rushed (Not maxed for the previous TH/BH)'
				].join('\n')
			);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS))
			.filter((unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			})
			.reduce<TroopJSON>((prev, curr) => {
				const unlockBuilding =
					curr.category === 'hero'
						? curr.village === 'home'
							? curr.name === 'Grand Warden'
								? 'Elixir Hero'
								: 'Dark Hero'
							: 'Builder Hall'
						: curr.unlock.building;
				if (!(unlockBuilding in prev)) prev[unlockBuilding] = [];
				prev[unlockBuilding].push(curr);
				return prev;
			}, {});

		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home') {
					prev.levels += apiTroop?.level ?? 0;
					prev.total += unit.levels[data.townHallLevel - 1];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		const remaining = Number((100 - (rem.levels * 100) / rem.total).toFixed(2));

		const titles: Record<string, string> = {
			'Barracks': `${EMOJIS.ELIXIR} Elixir Troops`,
			'Dark Barracks': `${EMOJIS.DARK_ELIXIR} Dark Troops`,
			'Spell Factory': `${EMOJIS.ELIXIR} Elixir Spells`,
			'Dark Spell Factory': `${EMOJIS.DARK_ELIXIR} Dark Spells`,
			'Dark Hero': `${EMOJIS.DARK_ELIXIR} Heroes`,
			'Elixir Hero': `${EMOJIS.ELIXIR} Heroes`,
			'Pet House': `${EMOJIS.DARK_ELIXIR} Pets`,
			'Workshop': `${EMOJIS.ELIXIR} Siege Machines`
			// 'Builder Hall': `${EMOJIS.BUILDER_ELIXIR} Builder Base Hero`,
			// 'Builder Barracks': `${EMOJIS.BUILDER_ELIXIR} Builder Troops`
		};

		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(Troops)) {
			const title = titles[key];
			if (!title) continue;
			units.push({
				index: indexes.indexOf(title),
				title,
				key,
				units: value
			});
		}

		const summary: Record<string, number> = {
			'Elixir': 0,
			'Dark Elixir': 0,
			'Time': 0
		};

		for (const category of units.sort((a, b) => a.index - b.index)) {
			const unitsArray = category.units.map((unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const maxLevel = apiTroop?.maxLevel ?? unit.levels[unit.levels.length - 1];
				const _level = apiTroop?.level ?? 0;
				const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel ?? 0;
				const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);
				const isRushed = unit.levels[hallLevel - 2] > level;
				const hallMaxLevel = unit.levels[hallLevel - 1];

				const remainingCost = level
					? unit.upgrade.cost.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
					: unit.unlock.cost + unit.upgrade.cost.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0);

				const remainingTime = level
					? unit.upgrade.time.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
					: unit.unlock.time + unit.upgrade.time.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0);

				return {
					type: unit.category,
					village: unit.village,
					name: unit.name,
					level,
					isRushed,
					hallMaxLevel,
					maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel),
					resource: unit.upgrade.resource,
					upgradeCost: level ? unit.upgrade.cost[level - (unit.minLevel ?? 1)] : unit.unlock.cost,
					upgradeTime: level ? unit.upgrade.time[level - (unit.minLevel ?? 1)] : unit.unlock.time,
					remainingCost,
					remainingTime
				};
			});

			const _totalTime = unitsArray.reduce((prev, curr) => prev + curr.remainingTime, 0);
			const _totalCost = unitsArray.reduce((prev, curr) => prev + curr.remainingCost, 0);
			const totalTime = this.dur(_totalTime).padStart(5, ' ');
			const totalCost = this.format(_totalCost).padStart(6, ' ');

			const totalMaxLevel = unitsArray.reduce((prev, curr) => prev + curr.hallMaxLevel, 0);
			const totalLevel = unitsArray.reduce((prev, curr) => prev + curr.level, 0);
			const remaining = `${Math.round((totalLevel * 100) / totalMaxLevel)}%`;

			const costPerResource = unitsArray.reduce<Record<string, number>>((prev, curr) => {
				if (!(curr.resource in prev)) prev[curr.resource] = 0;
				prev[curr.resource] += curr.remainingCost;
				return prev;
			}, {});

			for (const [key, value] of Object.entries(costPerResource)) {
				if (!(key in summary)) summary[key] = 0;
				summary[key] += value;
			}
			summary['Time'] += _totalTime;

			const descriptionTexts = [
				`**${category.title}**`,
				unitsArray
					.map((unit) => {
						const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
						const level = this.padStart(unit.level);
						const maxLevel = this.padEnd(unit.hallMaxLevel);
						const upgradeTime = this.dur(unit.remainingTime).padStart(5, ' ');
						const upgradeCost = this.format(unit.remainingCost).padStart(6, ' ');
						const rushed = unit.isRushed ? `\` R \`` : '`   `';
						return `\u200e${unitIcon} \` ${level}/${maxLevel} \` \` ${upgradeTime} \` \` ${upgradeCost} \` ${rushed}`;
					})
					.join('\n'),
				unitsArray.length > 1
					? `\u200e${EMOJIS.CLOCK} \` ${this.centerText(remaining, 5)} \` \` ${totalTime} \` \` ${totalCost} \` \`   \``
					: ''
			];

			if (category.key === 'Barracks' && unitsArray.length) {
				embed.setDescription([embed.data.description, '', ...descriptionTexts].join('\n'));
			}

			if (unitsArray.length && category.key !== 'Barracks') {
				embed.addFields([
					{
						name: '\u200b',
						value: [...descriptionTexts].join('\n')
					}
				]);
			}
		}

		if (!embed.data.fields?.length && embed.data.description?.length) {
			embed.setDescription(
				`No remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? ` and BH ${data.builderHallLevel}` : ''}`
			);
		}

		if (remaining > 0) {
			const elixir = this.format(summary['Elixir'] || 0);
			const dark = this.format(summary['Dark Elixir'] || 0);
			const time = this.dur(summary['Time'] || 0);
			embed.setFooter({
				text: [`Remaining ~${remaining}%`, `Total ${elixir} Elixir, ${dark} Dark, ${time}`].join('\n')
			});
		}

		if (embedLength(embed.toJSON()) > 6000) {
			embed.spliceFields(embed.data.fields!.length - 1, 1);
		}

		return embed;
	}

	private padEnd(num: number) {
		return num.toString().padEnd(2, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(2, ' ');
	}

	public centerText(text: string, width: number) {
		const padding = width - text.length;
		const leftPadding = Math.floor(padding / 2);
		return text.padStart(text.length + leftPadding, ' ').padEnd(width, ' ');
	}

	private apiTroops(data: APIPlayer) {
		return [
			...data.troops.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e9
			? `${(Math.abs(num) / 1.0e9).toFixed(Math.abs(num) / 1.0e9 >= 100 ? 1 : 2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(Math.abs(num) / 1.0e6 >= 100 ? 1 : 2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(Math.abs(num) / 1.0e3 >= 100 ? 1 : 2)}K`
			: Math.abs(num).toFixed(0);
	}

	private dur(sec: number) {
		if (!sec) return '  -  ';
		return Util.ms(sec * 1000);
	}

	private toGameString(num: number) {
		return num.toLocaleString('en-US').replace(/,/g, ' ');
	}
}
