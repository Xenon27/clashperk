import { Collections } from '@clashperk/node';
import { Guild, GuildMember } from 'discord.js';
import Client from '../struct/Client';

const ActionType: { [key: string]: string } = {
	LEFT: '%PLAYER% left.',
	JOINED: '%PLAYER% joined.',
	DEMOTED: '%PLAYER% has been demoted.',
	PROMOTED: '%PLAYER% has been promoted.'
};

export interface RPCFeed {
	clan: {
		tag: string;
		name: string;
		badge: string;
	};
	members: {
		op: string;
		tag: string;
		name: string;
		rand: number;
		role: string;
		donations: number;
		donationsReceived: number;
	}[];
	memberList: {
		tag: string; role: string;
		clan: { tag: string };
	}[];
}

const roles: { [key: string]: number } = {
	member: 1, admin: 2, coLeader: 3
};

export class RoleManager {
	private readonly queues: string[];

	public constructor(private readonly client: Client) {
		this.queues = [];
	}

	public async exec(tag: string, data: RPCFeed) {
		const cursor = this.client.db.collection(Collections.CLAN_STORES)
			.aggregate([
				{
					$match: {
						autoRole: { $gte: 1 }
					}
				}, {
					$group: {
						_id: {
							guild: '$guild',
							autoRole: '$autoRole'
						},
						guilds: {
							$addToSet: '$$ROOT'
						}
					}
				}, {
					$set: {
						guild_id: '$_id.guild',
						type: '$_id.autoRole'
					}
				}, {
					$unset: '_id'
				}, {
					$match: { 'guilds.tag': tag }
				}
			]);

		const clans: { clans: any[]; guild_id: string; type: 1 | 2 }[] = await cursor.toArray();

		for (const group of clans.filter(ex => ex.type === 2 && ex.clans.length)) {
			await this.addSameTypeRole(group.guild_id, group.clans, data);
		}

		for (const group of clans.filter(ex => ex.type === 1 && ex.clans.length)) {
			const clan = group.clans.find(clan => clan.tag === data.clan.tag);
			if (clan) await this.addUniqueTypeRole(group.guild_id, clan, data);
		}

		return cursor.close();
	}

	private async addUniqueTypeRole(guild: string, clan: any, data: RPCFeed) {
		console.log(`======================= UNIQUE_TYPE_AUTO_ROLE  ${data.clan.name} (${data.clan.tag}) =======================`);

		const collection = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map(mem => mem.tag) } })
			.toArray();

		const flattened = this.flatPlayers(collection, clan.secureRole);
		for (const member of data.members) {
			const mem = flattened.find(a => a.tag === member.tag);
			if (!mem) continue;
			const acc = flattened.filter(a => a.user === mem.user);

			const tags = acc.map(en => en.tag);
			const multi = data.memberList.filter(mem => tags.includes(mem.tag));
			const role = this.getHighestRole(multi, [clan.tag]) || member.role;

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			await this.manageRole(mem.user, guild, role, clan.roles, reason);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async addSameTypeRole(guild: string, clans: any[], data: RPCFeed) {
		const clan = clans[0];
		console.log(`======================= SAME_TYPE_AUTO_ROLE ${data.clan.name} (${data.clan.tag}) =======================`);

		const collection = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map(mem => mem.tag) } })
			.toArray();

		const flattened = this.flatPlayers(collection, clan.secureRole);
		const players = (await this.client.http.detailedClanMembers(flattened))
			.filter(res => res.ok);

		for (const member of data.members) {
			const mem = flattened.find(a => a.tag === member.tag);
			if (!mem) continue;
			const acc = flattened.filter(a => a.user === mem.user);

			const tags = acc.map(en => en.tag);
			const role = this.getHighestRole(players.filter(en => tags.includes(en.tag)), clans.map(clan => clan.tag));

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			await this.manageRole(mem.user, guild, role, clan.roles, reason);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async manageRole(user_id: string, guild_id: string, clanRole: string, roles: { [key: string]: string }, reason: string) {
		return this.addRoles(guild_id, user_id, roles[clanRole], Object.values(roles), reason);
	}

	public async addRoles(guild_id: string, user_id: string, role_id: string, roles: string[], reason: string) {
		const guild = this.client.guilds.cache.get(guild_id);

		if (!role_id && !roles.length) return null;
		if (!guild?.me?.permissions.has('MANAGE_ROLES')) return null;

		const member = await guild.members.fetch({ user: user_id, force: true }).catch(() => null);
		if (!member) return null;
		if (member.user.bot) return null;

		console.log(`MEMBER_FOUND: ${member.user.tag}`);
		const excluded = roles.filter(id => id !== role_id && this.checkRole(guild, guild.me!, id))
			.filter(id => member.roles.cache.has(id));

		if (excluded.length) {
			await member.roles.remove(excluded, reason);
		}

		console.log(`ROLE_TO_BE_ADDED: ${role_id} | EX: ${excluded.length}`);
		if (!role_id) return null;
		if (!guild.roles.cache.has(role_id)) return null;

		const role = guild.roles.cache.get(role_id)!;
		if (role.position > guild.me.roles.highest.position) return null;

		console.log('========== ADDED_ROLE ==========');
		if (member.roles.cache.has(role_id)) return null;
		return member.roles.add(role, reason).catch(() => null);
	}

	private flatPlayers(collection: { user: string; entries: { tag: string; verified: boolean }[] }[], secureRole: boolean) {
		return collection.reduce(
			(prev, curr) => {
				prev.push(
					...curr.entries.map(
						en => ({ user: curr.user, tag: en.tag, verified: en.verified })
					)
				);
				return prev;
			}, [] as { user: string; tag: string; verified: boolean }[]
		).filter(en => secureRole ? en.verified : true);
	}

	private checkRole(guild: Guild, member: GuildMember, role_id: string) {
		const role = guild.roles.cache.get(role_id);
		return role && member.roles.highest.position > role.position;
	}

	private getHighestRole(players: { tag: string; role?: string; clan?: { tag: string } }[], clans: string[]) {
		const unique = players.filter(a => a.clan && clans.includes(a.clan.tag) && a.role! in roles)
			.map(a => a.role!);

		return unique.sort((a, b) => roles[b] - roles[a])[0];
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}
}
