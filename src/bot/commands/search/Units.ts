import { BUILDER_TROOPS, HOME_TROOPS, SUPER_TROOPS } from '../../util/Emojis';
import { TroopInfo, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { Player } from 'clashofclans.js';

export default class UnitsCommand extends Command {
	public constructor() {
		super('units', {
			aliases: ['units', 'troops', 'u'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS'],
			description: {
				content: 'Shows troop, spell & hero levels.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			optionFlags: ['--tag', '--base']
		});
	}

	public *args(msg: Message) {
		const base = yield {
			flag: '--base',
			unordered: true,
			type: Argument.range('integer', 1, 25),
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolvePlayer(msg, tag, base ?? 1)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Player }) {
		const embed = this.embed(data, true);
		embed.setColor(this.client.embed(message))
			.setFooter(`Level / Town Hall ${data.townHallLevel}${data.builderHallLevel ? ` & Builder Hall ${data.builderHallLevel}` : ''} Max`);
		const msg = await message.util!.send({ embed });

		await msg.react('🔥');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['🔥'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '🔥') {
				const embed = this.embed(data, false);
				embed.setColor(this.client.embed(message));
				return msg.edit({ embed: embed.setFooter('Level / Max Level') });
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	private embed(data: Player, option = true) {
		const embed = new MessageEmbed()
			.setAuthor(
				`${data.name} (${data.tag})`,
				`https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`,
				`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`
			);

		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > 0;
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > 0;
				return Boolean(homeTroops || builderTroops);
			})
			.reduce((prev, curr) => {
				if (!(curr.productionBuilding in prev)) prev[curr.productionBuilding] = [];
				prev[curr.productionBuilding].push(curr);
				return prev;
			}, {} as TroopJSON);

		const titles: { [key: string]: string } = {
			'Barracks': 'Elixir Troops',
			'Dark Barracks': 'Dark Troops',
			'Spell Factory': 'Elixir Spells',
			'Dark Spell Factory': 'Dark Spells',
			'Workshop': 'Siege Machines',
			'Builder Hall': 'Builder Base Hero',
			'Town Hall': 'Heroes',
			'Builder Barracks': 'Builder Troops'
		};

		const apiTroops = this.apiTroops(data);
		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(Troops)) {
			const title = titles[key];
			units.push({
				index: indexes.indexOf(title),
				title,
				units: value
			});
		}

		for (const category of units.sort((a, b) => a.index - b.index)) {
			const unitsArray = category.units.map(
				unit => {
					const { maxLevel, level } = apiTroops
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.type) ?? { maxLevel: 0, level: 0 };
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

					return {
						type: unit.type,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 1],
						maxLevel
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					category.title,
					this.chunk(unitsArray)
						.map(
							chunks => chunks.map(unit => {
								const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
								const level = this.padStart(unit.level);
								const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
								return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
							}).join(' ')
						)
						.join('\n')
				);
			}
		}

		const superTrops = RAW_TROOPS_DATA.SUPER_TROOPS
			.filter(unit => apiTroops.find(un => un.name === unit.original && un.village === unit.village && un.level >= unit.minOriginalLevel))
			.map(
				unit => {
					const { maxLevel, level, name } = apiTroops
						.find(u => u.name === unit.original && u.village === unit.village) ?? { maxLevel: 0, level: 0 };
					const hallLevel = data.townHallLevel;

					const originalTroop = RAW_TROOPS_DATA.TROOPS
						.find(un => un.name === name && un.type === 'troop' && un.village === 'home');

					return {
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: originalTroop!.levels[hallLevel - 1],
						maxLevel
					};
				}
			);

		if (superTrops.length) {
			embed.addField('Super Troops', [
				this.chunk(superTrops)
					.map(
						chunks => chunks.map(unit => {
							const unitIcon = SUPER_TROOPS[unit.name];
							const level = this.padStart(unit.level);
							const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
							return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
						}).join(' ')
					)
					.join('\n')
			]);
		}

		return embed;
	}

	private chunk(items: TroopInfo[] | Omit<TroopInfo, 'type'>[] = [], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private padEnd(num: number) {
		return num.toString().padEnd(2, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private apiTroops(data: Player) {
		return [
			...data.troops.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}
}
