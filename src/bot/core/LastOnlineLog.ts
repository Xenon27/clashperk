import { MessageEmbed, Message, Collection, TextChannel, PermissionString } from 'discord.js';
import { COLLECTIONS } from '../util/Constants';
import { Clan } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import moment from 'moment';

export default class LastOnlineEvent {
	public cached = new Collection<string, any>();
	public lastReq: { id: string | null; count: number };

	public constructor(private readonly client: Client) {
		this.lastReq = {
			id: null,
			count: 0
		};
	}

	public async exec(tag: string, clan: Clan, members: any[]) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, clan, members);
		}

		return clans.clear();
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private async throttle(id: string) {
		if (this.lastReq.id === id) await this.delay(this.lastReq.count >= 4 ? 2000 : 1000);

		if (this.lastReq.id === id) {
			this.lastReq.count += 1;
			this.lastReq.id = id;
		} else {
			this.lastReq.count = 0;
			this.lastReq.id = id;
		}

		return Promise.resolve();
	}

	private async permissionsFor(id: string, cache: any, clan: Clan, members: any[]) {
		const permissions = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions as PermissionString[], false)) {
				await this.throttle(channel.id);
				return this.handleMessage(id, channel, clan, members);
			}
		}
	}

	private async handleMessage(id: string, channel: TextChannel, clan: Clan, members: any[]) {
		const cache = this.cached.get(id);

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan, members);
		}

		if (cache.msg) {
			return this.edit(id, cache.msg, clan, members);
		}

		const message = await channel.messages.fetch(cache.message, false)
			.catch(error => {
				this.client.logger.warn(error, { label: 'LAST_ONLINE_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			return this.sendNew(id, channel, clan, members);
		}

		if (message instanceof Message) {
			return this.edit(id, message, clan, members);
		}
	}

	private async sendNew(id: string, channel: TextChannel, clan: Clan, members: any[]) {
		const embed = await this.embed(clan, id, members);
		const message = await channel.send({ embed })
			.catch(() => null);

		if (message) {
			try {
				const cache = this.cached.get(id)!;
				cache.message = message.id;
				cache.msg = message;
				this.cached.set(id, cache);
				await this.client.db.collection(COLLECTIONS.LAST_ONLINE_LOGS)
					.updateOne(
						{ clan_id: new ObjectId(id) },
						{ $set: { message: message.id } }
					);
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	private async edit(id: string, message: Message, clan: Clan, members: any[]) {
		const embed = this.embed(clan, id, members);

		return message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					const cache = this.cached.get(id);
					cache.msg = undefined;
					this.cached.set(id, cache);
					return this.sendNew(id, message.channel as TextChannel, clan, members);
				}
				return null;
			});
	}

	private embed(clan: Clan, id: string, members: any[]) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\n\u200e${'LAST-ON'.padStart(7, ' ')}  ${'NAME'.padEnd(18, ' ')}`,
				members.map(m => `${m.lastSeen ? this.format(Number(m.lastSeen) + 1e3) : ''.padStart(7, ' ')}  ${m.name as string}`)
					.join('\n'),
				'\`\`\`'
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return embed;
	}

	private format(ms: number) {
		if (ms > 864e5) {
			return moment.duration(ms).format('d[d] H[h]', { trim: 'both mid' }).padStart(7, ' ');
		} else if (ms > 36e5) {
			return moment.duration(ms).format('H[h] m[m]', { trim: 'both mid' }).padStart(7, ' ');
		}
		return moment.duration(ms).format('m[m] s[s]', { trim: 'both mid' }).padStart(7, ' ');
	}

	public async init() {
		await this.client.db.collection('lastonlinelogs')
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					// guild: data.guild,
					channel: data.channel,
					message: data.message,
					color: data.color,
					tag: data.tag
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db
			.collection('lastonlinelogs')
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			// guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color,
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
