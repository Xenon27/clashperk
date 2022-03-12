import { Command, PrefixSupplier, Argument, Flag } from 'discord-akairo';
import { Message, MessageEmbed, GuildMember, MessageActionRow, MessageButton } from 'discord.js';

export default class LinkCommand extends Command {
	public constructor() {
		super('link', {
			aliases: ['link'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Links a Player or Clan to a Discord account.'
				],
				usage: '<#tag> [@user] [--default]',
				examples: []
			},
			flags: ['--default'],
			optionFlags: ['--user', '--tag']
		});
	}

	public *args(msg: Message): unknown {
		const tag = yield {
			type: Argument.union(
				[
					['link-add', 'create'],
					['link-list', 'list'],
					['link-remove', 'delete']
				],
				(msg: Message, tag: string) => this.parseTag(tag)
			)
		};

		if (['link-add', 'link-remove', 'link-list', 'link-alias'].includes(tag)) return Flag.continue(tag);

		const member = yield {
			'type': Argument.union('member', (msg, id) => {
				if (!id) return null;
				if (!/^\d{17,19}/.test(id)) return null;
				return msg.guild!.members.fetch(id).catch(() => null);
			}),
			'flag': '--user',
			'default': (msg: Message) => msg.member,
			'match': msg.interaction ? 'option' : 'rest'
		};

		const def = yield {
			match: 'flag',
			flag: ['--default']
		};

		return { tag, member, def };
	}

	public async exec(message: Message, { tag, member, def }: { tag: string; member: GuildMember; def: boolean }) {
		if (!tag) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setDescription([
					`\`${prefix}link ${this.description.usage as string}\``,
					'',
					this.description.content.join('\n'),
					'',
					'**Examples**',
					this.description.examples.map((en: string) => `\`${prefix}link ${en}\``).join('\n')
				].join('\n'));

			return message.util!.send(
				{ embeds: [embed], content: '**You must provide a valid argument to run this command, check examples and usage below.**' }
			);
		}

		const clanCommand = this.handler.modules.get('link-clan')!;
		const playerCommand = this.handler.modules.get('link-add')!;
		const tags = await Promise.all([this.client.http.clan(tag), this.client.http.player(tag)]);

		const types: { [key: string]: string } = {
			1: 'CLAN',
			2: 'PLAYER'
		};

		if (tags.every(a => a.ok)) {
			const embed = this.client.util.embed()
				.setDescription([
					'**What would you like to link? A Player or a Clan?**',
					'',
					tags.map((a, i) => `**${types[i + 1]}**\n${a.name} (${a.tag})\n`).join('\n')
				].join('\n'));

			const [ClanCustomID, PlayerCustomID, CancelID] = [this.client.uuid(message.author.id), this.client.uuid(message.author.id), this.client.uuid(message.author.id)];
			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setStyle('SECONDARY')
						.setLabel('LINK PLAYER')
						.setCustomId(PlayerCustomID)
				)
				.addComponents(
					new MessageButton()
						.setStyle('SECONDARY')
						.setLabel('LINK CLAN')
						.setCustomId(ClanCustomID)
				)
				.addComponents(
					new MessageButton()
						.setStyle('DANGER')
						.setLabel('CANCEL')
						.setCustomId(CancelID)
				);
			const msg = await message.util!.send({ embeds: [embed], components: [row] });

			const collector = msg.createMessageComponentCollector({
				filter: action => [ClanCustomID, PlayerCustomID, CancelID].includes(action.customId) && action.user.id === message.author.id,
				time: 5 * 60 * 1000
			});

			collector.on('collect', async action => {
				if (action.customId === ClanCustomID) {
					await action.update({ components: [] });
					await this.handler.runCommand(message, clanCommand, { data: tags[0], parsed: member });
				}

				if (action.customId === PlayerCustomID) {
					await action.update({ components: [] });
					await this.handler.runCommand(message, playerCommand, { data: tags[1], member: member, def });
				}

				if (action.customId === CancelID) {
					await action.update({
						embeds: [],
						components: [],
						content: '**This command has been cancelled.**'
					});
				}
			});

			collector.on('end', async (_, reason) => {
				this.client.components.delete(CancelID);
				this.client.components.delete(ClanCustomID);
				this.client.components.delete(PlayerCustomID);
				if (!/delete/i.test(reason)) await msg.edit({ components: [] });
			});
		} else if (tags[0].ok) { // eslint-disable-line
			return this.handler.runCommand(message, clanCommand, { data: tags[0], parsed: member });
		} else if (tags[1].ok) {
			return this.handler.runCommand(message, playerCommand, { data: tags[1], member: member, def });
		} else {
			return message.util!.send('**I tried to search the tag as a clan and player but couldn\'t find a match.**');
		}
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private parseTag(tag?: string) {
		return tag ? `#${tag.toUpperCase().replace(/o|O/g, '0').replace(/^#/g, '')}` : null;
	}
}
