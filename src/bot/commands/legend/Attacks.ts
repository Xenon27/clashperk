import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, escapeMarkdown, User } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { attackCounts } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Season, Util } from '../../util/index.js';

export default class LegendAttacksCommand extends Command {
	public constructor() {
		super('legend-attacks', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public args(): Args {
		return {
			clan_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	private getDay(day?: number) {
		if (!day) return { ...Util.getCurrentLegendTimestamp(), day: Util.getLegendDay() };
		const days = Util.getLegendDays();
		const num = Math.min(days.length, Math.max(day, 1));
		return { ...days[num - 1], day };
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; day?: number }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const multi = this.client.redis.multi();
		const seasonId = Season.ID;
		clan.memberList.map((mem) => multi.json.get(`LP-${seasonId}-${mem.tag}`));
		const raw = (await multi.exec()) as unknown as ({
			name: string;
			tag: string;
			logs: { start: number; end: number; timestamp: number; inc: number; type?: string }[];
		} | null)[];

		const { startTime, endTime, day } = this.getDay(args.day);

		const members = [];
		for (const legend of raw) {
			if (!legend) continue;

			const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
			if (logs.length === 0) continue;

			const attacks = logs.filter((en) => en.inc > 0);
			const defenses = logs.filter((en) => en.inc <= 0);

			const [initial] = logs;
			const [current] = logs.slice(-1);

			const attackCount = Math.min(attacks.length);
			const defenseCount = Math.min(defenses.length);

			const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
			const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

			const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

			members.push({
				name: legend.name,
				tag: legend.tag,
				attacks,
				defenses,
				attackCount,
				defenseCount,
				trophiesFromAttacks,
				trophiesFromDefenses,
				netTrophies,
				initial,
				current
			});
		}

		const embed = new EmbedBuilder()
			.setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
			.setColor(this.client.embed(interaction));

		embed.setDescription(
			[
				'**Legend League Attacks**',
				'```',
				'\u200e GAIN  LOSS FINAL NAME',
				...members.map(
					(mem) =>
						`\u200e${this.pad(`+${mem.trophiesFromAttacks}${attackCounts[Math.min(9, mem.attackCount)]}`, 5)} ${this.pad(
							`-${Math.abs(mem.trophiesFromDefenses)}${attackCounts[Math.min(9, mem.defenseCount)]}`,
							5
						)}  ${this.pad(mem.current.end)} ${escapeMarkdown(mem.name)}`
				),
				'```'
			].join('\n')
		);

		embed.setFooter({ text: `Day ${day} (${Season.ID})` });
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setEmoji(EMOJIS.REFRESH)
				.setStyle(ButtonStyle.Secondary)
				.setCustomId(JSON.stringify({ cmd: this.id, tag: args.tag }))
		);
		const currDay = Util.getLegendDay();
		return interaction.editReply({ embeds: [embed], components: currDay === day ? [row] : [] });
	}

	private pad(num: number | string, padding = 4) {
		return num.toString().padStart(padding, ' ');
	}
}
