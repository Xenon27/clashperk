import { Collection, EmbedBuilder, PermissionsString, WebhookClient, escapeMarkdown, time } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import Client from '../struct/Client.js';
import { Collections, DonationLogFrequencyTypes } from '../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS, PLAYER_LEAGUES, RED_NUMBERS } from '../util/Emojis.js';
import { Season, Util } from '../util/index.js';
import BaseLog from './BaseLog.js';

// const now = moment('2023-04-01').toDate();

export default class DonationLog extends BaseLog {
	public declare cached: Collection<string, Cache>;
	private readonly queued = new Set<string>();
	private readonly refreshRate: number;

	public constructor(client: Client) {
		super(client);
		this.refreshRate = 15 * 60 * 1000;
	}

	public override get permissions(): PermissionsString[] {
		return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
	}

	public override get collection() {
		return this.client.db.collection(Collections.DONATION_LOGS);
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		if (
			!(data.gte && data.lte) &&
			cache.interval &&
			cache.interval.some((i) =>
				[DonationLogFrequencyTypes.Daily, DonationLogFrequencyTypes.Monthly, DonationLogFrequencyTypes.Weekly].includes(i)
			)
		) {
			return null;
		}

		const msg = await this.send(cache, webhook, data);
		if (data.gte && data.lte) {
			const interval = data.interval.toLowerCase();
			return this.collection.updateOne({ clanId: cache.clanId }, { $set: { [`${interval}LastPosted`]: new Date() } });
		}
		return this.updateMessageId(cache, msg);
	}

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed =
			data.gte && data.lte
				? await this.rangeDonation(cache, { gte: data.gte, lte: data.lte, interval: data.interval, tag: cache.tag })
				: this.embed(cache, data);

		if (!embed) return null;
		try {
			return await super._send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'DonationLog' });
			return null;
		}
	}

	private embed(cache: Cache, data: Feed) {
		const embed = new EmbedBuilder()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
			.setThumbnail(data.clan.badge)
			.setFooter({ text: `${data.clan.members} Members`, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
			.setTimestamp();
		if (cache.color) embed.setColor(cache.color);

		if (data.donated.length) {
			embed.addFields([
				{
					name: `${EMOJIS.USER_BLUE} Donated`,
					value: [
						data.donated
							.map((m) => {
								if (m.donated > 200) {
									const [div, mod] = this.divmod(m.donated);
									const list = [
										`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
									];
									if (mod > 0)
										return list
											.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[mod.toString()]!} ${m.name}`)
											.join('\n');
									return list.join('\n');
								}
								return `\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[m.donated]!} ${m.name}`;
							})
							.join('\n')
							.substring(0, 1024)
					].join('\n')
				}
			]);
		}

		if (data.received.length) {
			embed.addFields([
				{
					name: `${EMOJIS.USER_RED} Received`,
					value: [
						data.received
							.map((m) => {
								if (m.received > 200) {
									const [div, mod] = this.divmod(m.received);
									const list = [
										`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
									];
									if (mod > 0)
										return list
											.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[mod.toString()]!} ${m.name}`)
											.join('\n');
									return list.join('\n');
								}
								return `\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[m.received]!} ${m.name}`;
							})
							.join('\n')
							.substring(0, 1024)
					].join('\n')
				}
			]);
		}

		return embed;
	}

	public async rangeDonation(
		cache: Cache,
		{
			tag,
			gte,
			lte,
			interval
		}: {
			tag: string;
			gte: string;
			lte: string;
			interval: string;
		}
	) {
		const clan = await this.client.http.clan(tag);
		if (!clan.ok) return null;
		if (!clan.members) return null;

		const { aggregations } = await this.client.elastic.search({
			index: 'donation_events',
			size: 0,
			from: 0,
			query: {
				bool: {
					filter: [
						{
							term: {
								clan_tag: clan.tag
							}
						},
						{
							range: {
								created_at: {
									gte,
									lte
								}
							}
						}
					]
				}
			},
			aggs: {
				players: {
					terms: {
						field: 'tag',
						size: 10000
					},
					aggs: {
						donated: {
							filter: { term: { op: 'DONATED' } },
							aggs: {
								total: {
									sum: {
										field: 'value'
									}
								}
							}
						},
						received: {
							filter: { term: { op: 'RECEIVED' } },
							aggs: {
								total: {
									sum: {
										field: 'value'
									}
								}
							}
						}
					}
				}
			}
		});

		const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
		const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
			acc[cur.key] = {
				donated: cur.donated.total.value,
				received: cur.received.total.value
			};
			return acc;
		}, {});

		const playerTags = Object.keys(playersMap);
		const currentMemberTags = clan.memberList.map((member) => member.tag);
		const oldMemberTags = playerTags.filter((tag) => !currentMemberTags.includes(tag));

		const players = await this.client.db
			.collection(Collections.LAST_SEEN)
			.find({ tag: { $in: oldMemberTags } }, { projection: { name: 1, tag: 1 } })
			.toArray();

		const result = [...clan.memberList, ...players].map((player) => ({
			name: player.name,
			tag: player.tag,
			donated: playersMap[player.tag]?.donated ?? 0, // eslint-disable-line
			received: playersMap[player.tag]?.received ?? 0 // eslint-disable-line
		}));

		result.sort((a, b) => b.received - a.received);
		result.sort((a, b) => b.donated - a.donated);

		const embed = new EmbedBuilder().setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.large });
		if (cache.color) embed.setColor(cache.color);
		embed.setDescription(
			[
				`**${this.titleCase(interval)} Donations**`,
				`${time(moment(gte).toDate())} - ${time(moment(lte).toDate())}`,
				'',
				...result.map((player) => {
					const don = this.padStart(player.donated, 5);
					const rec = this.padStart(player.received, 5);
					const name = escapeMarkdown(player.name);
					return `\` ${don} ${rec} \` ${name}`;
				})
			].join('\n')
		);

		const donated = result.reduce((acc, cur) => acc + cur.donated, 0);
		const received = result.reduce((acc, cur) => acc + cur.received, 0);
		embed.setFooter({ text: `[${donated} DON | ${received} REC]` });
		embed.setTimestamp();
		return embed;
	}

	private padStart(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private titleCase(str: string) {
		return str
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/\b(\w)/g, (char) => char.toUpperCase());
	}

	private divmod(num: number) {
		return [Math.floor(num / 100) * 100, num % 100];
	}

	public async init() {
		await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })
			.forEach((data) => {
				this.cached.set((data.clanId as ObjectId).toHexString(), {
					clanId: data.clanId,
					guild: data.guild,
					retries: 0,
					tag: data.tag,
					color: data.color,
					channel: data.channel,
					interval: data.interval,
					webhook: data.webhook ? new WebhookClient(data.webhook) : null
				});
			});

		await this._refresh_daily();
		setInterval(this._refresh_daily.bind(this), this.refreshRate).unref();

		await this._refresh_weekly();
		setInterval(this._refresh_weekly.bind(this), this.refreshRate).unref();

		await this._refreshMonthly();
		setInterval(this._refreshMonthly.bind(this), this.refreshRate).unref();
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clanId: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			clanId: data.clanId,
			guild: data.guild,
			tag: data.tag,
			color: data.color,
			channel: data.channel,
			retries: 0,
			interval: data.interval,
			webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
		});
	}

	private async _refresh_daily() {
		const interval = DonationLogFrequencyTypes.Daily;
		const lte = moment().startOf('day').toDate();
		const gte = moment(lte).subtract(1, 'd').toISOString();

		const timestamp = new Date(lte.getTime() + 6 * 60 * 60 * 1000);
		if (timestamp.getTime() > Date.now()) return;

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ dailyLastPosted: { $lt: timestamp }, interval })
			.toArray();

		for (const log of logs) {
			if (!this.client.guilds.cache.has(log.guild)) continue;
			if (this.queued.has(log._id.toHexString())) continue;

			this.queued.add(log._id.toHexString());
			await this.exec(log.tag, { tag: log.tag, gte, lte: lte.toISOString(), interval });
			this.queued.delete(log._id.toHexString());
			await Util.delay(3000);
		}
	}

	private async _refresh_weekly() {
		const interval = DonationLogFrequencyTypes.Weekly;
		const lte = moment().startOf('week').toDate();
		const gte = moment(lte).subtract(7, 'days').toISOString();

		const timestamp = new Date(lte.getTime() + 5 * 60 * 60 * 1000);
		if (timestamp.getTime() > Date.now()) return;

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ weeklyLastPosted: { $lt: timestamp }, interval })
			.toArray();

		for (const log of logs) {
			if (!this.client.guilds.cache.has(log.guild)) continue;
			if (this.queued.has(log._id.toHexString())) continue;

			this.queued.add(log._id.toHexString());
			await this.exec(log.tag, { tag: log.tag, gte, lte: lte.toISOString(), interval });
			this.queued.delete(log._id.toHexString());
			await Util.delay(3000);
		}
	}

	private async _refreshMonthly() {
		const interval = DonationLogFrequencyTypes.Monthly;
		const season = moment(Season.ID);
		const lte = Season.getLastMondayOfMonth(season.month() - 1, season.year());
		const gte = Season.getLastMondayOfMonth(lte.getMonth() - 1, lte.getFullYear()).toISOString();

		const timestamp = new Date(lte.getTime() + 30 * 60 * 1000);
		if (timestamp.getTime() > Date.now()) return;

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ monthlyLastPosted: { $lt: timestamp }, interval })
			.toArray();

		for (const log of logs) {
			if (!this.client.guilds.cache.has(log.guild)) continue;
			if (this.queued.has(log._id.toHexString())) continue;

			this.queued.add(log._id.toHexString());
			await this.exec(log.tag, { tag: log.tag, gte, lte: lte.toISOString(), interval });
			this.queued.delete(log._id.toHexString());
			await Util.delay(3000);
		}
	}
}

export interface Feed {
	clan: {
		tag: string;
		name: string;
		badge: string;
		members: number;
	};
	donated: {
		donated: number;
		name: string;
		tag: string;
		league: number;
	}[];
	received: {
		received: number;
		name: string;
		tag: string;
		league: number;
	}[];
	unmatched?: {
		in: number;
		out: number;
	};
	gte: string;
	lte: string;
	interval: string;
}

interface AggsBucket {
	key: string;
	doc_count: number;
	donated: {
		total: {
			value: number;
		};
	};
	received: {
		total: {
			value: number;
		};
	};
}

interface Cache {
	tag: string;
	clanId: ObjectId;
	color?: number | null;
	webhook: WebhookClient | null;
	deleted?: boolean;
	channel: string;
	guild: string;
	threadId?: string;
	retries: number;
	interval?: DonationLogFrequencyTypes[];
}
