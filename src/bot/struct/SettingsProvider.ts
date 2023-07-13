import { Collection, Db } from 'mongodb';
import { Guild } from 'discord.js';
import { Collections, Settings as SettingsEnum } from '../util/Constants.js';

export default class SettingsProvider {
	protected db: Collection<Settings>;
	private readonly settings = new Map();

	public constructor(db: Db) {
		this.db = db.collection(Collections.SETTINGS);

		this.db
			.watch(
				[
					{
						$match: {
							operationType: { $in: ['insert', 'update', 'delete'] }
						}
					}
				],
				{ fullDocument: 'updateLookup', maxTimeMS: 500, maxAwaitTimeMS: 500 }
			)
			.on('change', (change) => {
				if (change.operationType === 'insert' || change.operationType === 'update') {
					this.settings.set(change.fullDocument!.guildId, change.fullDocument);
				}
			});
	}

	public async init() {
		const collection = await this.db.find({}, { projection: { _id: 0 } }).toArray();
		for (const data of collection) {
			this.settings.set(data.guildId, data);
		}
	}

	public get<T>(guild: string | Guild, key: string, defaultValue?: any): T {
		const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
		if (this.settings.has(guildId)) {
			const value = this.settings.get(guildId)[key];
			// eslint-disable-next-line
			return value == null ? defaultValue : value;
		}

		return defaultValue;
	}

	public async set(guild: string | Guild, key: string, value: any) {
		const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
		const data = this.settings.get(guildId) || {};
		data[key] = value;
		this.settings.set(guildId, data);
		return this.db.updateOne({ guildId }, { $set: { [key]: value } }, { upsert: true });
	}

	public async delete(guild: string | Guild, key: string) {
		const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
		const data = this.settings.get(guildId) || {};
		delete data[key]; // eslint-disable-line

		return this.db.updateOne({ guildId }, { $unset: { [key]: '' } });
	}

	public async clear(guild: string | Guild) {
		const guildId = (this.constructor as typeof SettingsProvider).guildId(guild);
		this.settings.delete(guildId);
		return this.db.deleteOne({ guildId });
	}

	public flatten() {
		return this.settings.values();
	}

	public hasCustomBot(guild: string | Guild) {
		return this.get(guild, SettingsEnum.HAS_CUSTOM_BOT, false);
	}

	private static guildId(guild: string | Guild) {
		if (guild instanceof Guild) return guild.id;
		if (guild === 'global' || guild === null) return 'global'; // eslint-disable-line
		if (/^\d+$/.test(guild)) return guild;
		throw new TypeError('Invalid guild specified. Must be a Guild instance, guild ID, "global", or null.');
	}
}

interface Settings {
	guildId: string;
}
