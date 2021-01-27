import { COLLECTIONS } from '../../util/Constants';
import { Message, GuildMember } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class LinkPlayerCommand extends Command {
	public constructor() {
		super('link-player', {
			aliases: ['link-profile', 'save-profile', 'link-player'],
			category: 'hidden',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a player to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getPlayer(msg, tag)
				},
				{
					'id': 'member',
					'type': 'member',
					'default': (m: Message) => m.member
				},
				{
					id: 'def',
					match: 'flag',
					flag: ['--default']
				}
			]
		});
	}

	public async exec(message: Message, { data, member, def }: { data: Player; member: GuildMember; def: boolean }) {
		if (member.user.bot) return message.util!.send('Bots can\'t link accounts.');

		const doc = await this.getPlayer(data.tag);
		// only owner can set default account
		if (doc && doc.user === member.id && ((def && member.id !== message.author.id) || !def)) {
			return message.util!.send({
				embed: {
					description: `**${member.user.tag}** is already linked to **${data.name} (${data.tag})**`
				}
			});
		}

		if (doc && doc.user !== member.id) {
			return message.util!.send({
				embed: {
					description: `**${data.name} (${data.tag})** is already linked to another discord account.`
				}
			});
		}

		if (doc && doc.entries.length >= 25) {
			return message.util!.send({
				embed: {
					description: 'You can only link 25 player accounts.'
				}
			});
		}

		// only owner can set default account
		if (def && member.id === message.author.id) {
			await this.client.db.collection(COLLECTIONS.LINKED_USERS)
				.updateOne({ user: member.id }, { $pull: { entries: { tag: data.tag } } });
		}

		await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne({ user: member.id }, {
				$set: {
					user: member.id,
					createdAt: new Date()
				},
				$push: def && member.id === message.author.id // only owner can set default account
					? {
						entries: {
							$each: [{ tag: data.tag, verified: this.isVerified(doc, data.tag) }],
							$position: 0
						}
					}
					: {
						entries: {
							tag: data.tag,
							verified: false
						}
					}
			}, { upsert: true });

		this.client.http.linkPlayerTag(member.id, data.tag);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup commands, the bot will use the first one you linked.'
			]);
		return message.util!.send({ embed });
	}

	private isVerified(data: any, tag: string) {
		return Boolean(data?.entries.find((en: any) => en.tag === tag && en.verified));
	}

	private async getPlayer(tag: string) {
		return this.client.db.collection(COLLECTIONS.LINKED_USERS).findOne({ 'entries.tag': tag });
	}
}
