import { Message, MessageEmbed, Util } from 'discord.js';
import { COLLECTIONS } from '../../util/Constants';
import { Clan, ClanMember } from 'clashofclans.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';

// ASCII /[^\x00-\xF7]+/
export default class LinkListCommand extends Command {
	public constructor() {
		super('link-list', {
			aliases: ['links'],
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			channel: 'guild',
			description: {}
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (!data.members) return;
		const memberTags = await this.client.http.getDiscordLinks(data.memberList);
		const dbMembers = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.find({ 'entries.tag': { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		for (const member of dbMembers) {
			for (const m of member.entries) {
				if (!data.memberList.find(mem => mem.tag === m.tag)) continue;
				if (memberTags.find(mem => mem.tag === m.tag)) continue;
				memberTags.push({ tag: m.tag, user: member.user });
			}
		}

		await message.guild!.members.fetch({ user: memberTags.map(m => m.user) });

		const onDiscord = memberTags.filter(mem => message.guild!.members.cache.has(mem.user));
		const offDiscord = data.memberList.filter(m => !memberTags.some(en => en.tag === m.tag));

		const embed = this.buildEmbed(message, data, false, onDiscord, offDiscord);
		const msg = await message.util!.send({ embed });

		if (!onDiscord.length) return msg; // Let's stop right here!

		await msg.react('🔗');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['🔗'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '🔗') {
				const embed = this.buildEmbed(message, data, true, onDiscord, offDiscord);
				return message.util!.send({ embed });
			}
		});

		collector.on('end', () => msg.reactions.removeAll());
	}

	private buildEmbed(message: Message, data: Clan, showTag: boolean, onDiscord: { tag: string; user: string }[], offDiscord: ClanMember[]) {
		const chunks = Util.splitMessage([
			`${EMOJIS.DISCORD} **Players on Discord: ${onDiscord.length}**`,
			onDiscord.map(
				mem => {
					const member = data.memberList.find(m => m.tag === mem.tag)!;
					const user = showTag ? member.tag : message.guild!.members.cache.get(mem.user)!.displayName.substring(0, 10).padStart(10, ' ');
					return `**✓** \`\u200e${this.parseName(member.name)}${data.members <= 45 ? `\u200f\` \u200e \`` : ' '} ${user} \u200f\``;
				}
			).join('\n'),
			'',
			`${EMOJIS.WRONG} **Players not on Discord: ${offDiscord.length}**`,
			offDiscord.sort((a, b) => {
				const aName = a.name.toLowerCase();
				const bName = b.name.toUpperCase();
				return aName > bName ? 1 : aName < bName ? -1 : 0;
			}).map(
				mem => `✘ \`\u200e${this.parseName(mem.name)}${data.members <= 45 ? `\u200f\` \u200e \`` : ' '} ${mem.tag.padStart(10, ' ')} \u200f\``
			).join('\n')
		]);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription(chunks[0]);
		if (chunks.length > 1) {
			chunks.slice(1).map(chunk => embed.addField('\u200b', chunk));
		}

		return embed;
	}

	private parseName(name: string) {
		return name.replace(/[^\x00-\xF7]+/g, ' ').trim().padEnd(15, ' ');
	}
}
