import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, time } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/emojis.js';
import { padEnd, padStart } from '../../util/helper.js';

export default class LegendStatsCommand extends Command {
  public constructor() {
    super('legend-stats', {
      category: 'search',
      channel: 'guild',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>, args: { is_live?: boolean }) {
    const threshold = await this.getLegendThreshold(!!args.is_live);
    if (!threshold?.thresholds?.length) return interaction.editReply('No data available.');

    const embed = new EmbedBuilder();
    embed.setTitle(`Legend Ranks Threshold`);
    embed.setColor(this.client.embed(interaction));
    embed.setDescription(
      [
        '`  RANK ` `TROPHY` ` DIFF `',
        ...threshold.thresholds.map(({ rank, minTrophies, diff }) => {
          if (threshold.hasDiff) {
            const sign = diff > 0 ? '+' : '-';
            return `\`${padStart(rank.toLocaleString(), 6)} \` \` ${minTrophies} \` \` ${sign}${padEnd(Math.abs(diff), 4)}\` `;
          }
          return `\`${padStart(rank.toLocaleString(), 6)} \` \` ${minTrophies} \``;
        }),
        '',
        args.is_live ? `${time(new Date(), 'f')}` : `${time(moment(threshold.timestamp).toDate(), 'f')}`
      ].join('\n')
    );

    const customIds = {
      toggle: this.createId({ cmd: this.id, is_live: !args.is_live }),
      refresh: this.createId({ cmd: this.id, is_live: args.is_live })
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setLabel(args.is_live ? 'Last EOD' : 'Live')
        .setStyle(args.is_live ? ButtonStyle.Primary : ButtonStyle.Success)
        .setCustomId(customIds.toggle)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  private async getLegendThreshold(isLive: boolean) {
    const eodThresholds = await this.client.redis.getLegendThreshold('RAW:LEGEND-TROPHY-THRESHOLD');
    if (isLive) {
      const res = await fetch('https://api.clashperk.com/tasks/legend-trophy-threshold', {
        method: 'GET',
        headers: {
          'X-API-KEY': `${process.env.INTERNAL_API_KEY}`
        }
      });
      const result = (await res.json()) as { rank: number; minTrophies: number }[];

      const thresholds = result.map((threshold) => {
        const eod = eodThresholds?.thresholds.find((t) => t.rank === threshold.rank)?.minTrophies ?? threshold.minTrophies;
        return { ...threshold, diff: threshold.minTrophies - eod };
      });

      return { timestamp: new Date().toISOString(), thresholds, hasDiff: !!eodThresholds };
    }

    const lastEod = moment(moment().format('YYYY-MM-DD')).subtract(1, 'day').format('YYYY-MM-DD');
    const lastEodThresholds = await this.client.redis.getLegendThreshold(`RAW:LEGEND-TROPHY-THRESHOLD:${lastEod}`);

    if (eodThresholds) {
      const thresholds = eodThresholds.thresholds.map((threshold) => {
        const eod = lastEodThresholds?.thresholds.find((t) => t.rank === threshold.rank)?.minTrophies ?? threshold.minTrophies;
        return { ...threshold, diff: threshold.minTrophies - eod };
      });

      return { timestamp: eodThresholds.timestamp, thresholds, hasDiff: !!lastEodThresholds };
    }

    return null;
  }
}
