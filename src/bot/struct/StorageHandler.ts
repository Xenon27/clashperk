import { Collections, Flags } from '../util/Constants';
import { ObjectId, Collection } from 'mongodb';
import { Message } from 'discord.js';
import Client from './Client';
import { ClanWarLeagueGroup } from 'clashofclans.js';
import { Season } from '../packages';

export interface ClanStore {
	_id: ObjectId;
	flag: number;
	name: string;
	tag: string;
	alias?: string;
	guild: string;
	patron: boolean;
	paused: boolean;
	active: boolean;
	createdAt: Date;
	verified: boolean;
	lastRan?: Date;
	channels?: string[];
	autoRole: 1 | 2;
	secureRole: boolean;
	role_ids?: string[];
	roles?: { coLeader?: string; admin?: string; member?: string }[];
}

export default class StorageHandler {
	public collection: Collection<ClanStore>;

	public constructor(private readonly client: Client) {
		this.collection = client.db.collection(Collections.CLAN_STORES);
	}

	public async findAll(id: string) {
		return this.collection.find({ guild: id }).toArray();
	}

	public async register(message: Message, data: any) {
		const ex = await this.collection.findOne({ guild: message.guild!.id, autoRole: 2 });

		const collection = await this.collection.findOneAndUpdate(
			{ tag: data.tag, guild: data.guild },
			{
				$set: {
					name: data.name, tag: data.tag,
					paused: false, verified: true, active: true,
					guild: message.guild!.id, patron: this.client.patrons.get(message.guild!.id)
				},
				$setOnInsert: ex
					? {
						roles: ex.roles,
						createdAt: new Date(),
						role_ids: ex.role_ids,
						autoRole: ex.autoRole,
						secureRole: ex.secureRole
					}
					: {
						createdAt: new Date()
					},
				$bit: {
					flag: { or: Number(data.op) }
				}
			},
			{ upsert: true, returnOriginal: false }
		);

		const id = collection.value!._id.toHexString();

		switch (data.op) {
			case Flags.DONATION_LOG:
				await this.client.db.collection(Collections.DONATION_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Flags.CLAN_FEED_LOG:
				await this.client.db.collection(Collections.CLAN_FEED_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							role: data.role
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Flags.LAST_SEEN_LOG:
				await this.client.db.collection(Collections.LAST_SEEN_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Flags.CLAN_GAMES_LOG:
				await this.client.db.collection(Collections.CLAN_GAMES_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Flags.CLAN_EMBED_LOG:
				await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel,
							color: data.color,
							message: data.message,
							embed: data.embed
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			case Flags.CLAN_WAR_LOG:
				await this.client.db.collection(Collections.CLAN_WAR_LOGS)
					.updateOne({ tag: data.tag, guild: data.guild }, {
						$set: {
							clan_id: new ObjectId(id),
							tag: data.tag,
							guild: data.guild,
							name: data.name,
							channel: data.channel
						},
						$min: {
							createdAt: new Date()
						}
					}, { upsert: true });
				break;
			default:
				break;
		}

		return id;
	}

	public async delete(id: string) {
		await this.client.db.collection(Collections.DONATION_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_FEED_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.LAST_SEEN_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_GAMES_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		await this.client.db.collection(Collections.CLAN_WAR_LOGS)
			.deleteOne({ clan_id: new ObjectId(id) });

		return this.client.db.collection(Collections.CLAN_STORES)
			.deleteOne({ _id: new ObjectId(id) });
	}

	public async remove(id: string, data: any) {
		if (data.op === Flags.DONATION_LOG) {
			return this.client.db.collection(Collections.DONATION_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_FEED_LOG) {
			return this.client.db.collection(Collections.CLAN_FEED_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Flags.LAST_SEEN_LOG) {
			return this.client.db.collection(Collections.LAST_SEEN_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_GAMES_LOG) {
			return this.client.db.collection(Collections.CLAN_GAMES_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_EMBED_LOG) {
			return this.client.db.collection(Collections.CLAN_EMBED_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}

		if (data.op === Flags.CLAN_WAR_LOG) {
			return this.client.db.collection(Collections.CLAN_WAR_LOGS)
				.deleteOne({ clan_id: new ObjectId(id) });
		}
	}

	public async getWarTags(tag: string) {
		const data = await this.client.db.collection(Collections.CWL_GROUPS)
			.find({ 'clans.tag': tag })
			.sort({ createdAt: -1 })
			.limit(1)
			.next();
		if (data?.warTags?.[tag]?.length !== 7) return null;

		if (
			(new Date().getMonth() === new Date(data?.season).getMonth()) ||
			(new Date(data?.season).getMonth() === (new Date().getMonth() - 1) && new Date().getDate() <= 8)
		) return data;

		return Promise.resolve(null);
	}

	public async pushWarTags(tag: string, body: ClanWarLeagueGroup) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		if (rounds.length !== 7) return null;

		const data = await this.client.db.collection(Collections.CWL_GROUPS)
			.find({ 'clans.tag': tag })
			.sort({ createdAt: -1 })
			.limit(1)
			.next();
		if (data?.season === this.seasonID) return null;
		if (data && new Date().getMonth() <= new Date(data.season).getMonth()) return null;

		const warTags = body.clans.reduce((pre, clan) => {
			pre[clan.tag] = [];
			return pre;
		}, {} as { [key: string]: string[] });

		for (const round of rounds) {
			for (const warTag of round.warTags) {
				const data = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;
				if (!warTags[data.clan.tag].includes(warTag)) warTags[data.clan.tag].push(warTag);
				if (!warTags[data.opponent.tag].includes(warTag)) warTags[data.opponent.tag].push(warTag);
			}
		}

		return this.pushToDB(tag, body.clans, warTags, rounds, body.season);
	}

	private async pushToDB(tag: string, clans: { tag: string; name: string }[], warTags: any, rounds: any[], season: string) {
		return this.client.db.collection(Collections.CWL_GROUPS)
			.updateOne({ 'clans.tag': tag, 'season': Season.generateID(season) }, {
				$set: {
					warTags, rounds
				},
				$setOnInsert: {
					id: await this.uuid(),
					createdAt: new Date(),
					clans: clans.map(clan => ({ tag: clan.tag, name: clan.name }))
				}
			}, { upsert: true });
	}

	private async uuid() {
		const cursor = this.client.db.collection(Collections.CWL_GROUPS)
			.find()
			.sort({ id: -1 })
			.limit(1);

		const uuid: number = await cursor.hasNext() ? (await cursor.next()).id : 0;
		return cursor.close().then(() => uuid + 1);
	}

	private get seasonID() {
		return new Date().toISOString().substring(0, 7);
	}
}
