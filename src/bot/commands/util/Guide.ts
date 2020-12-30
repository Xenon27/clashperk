import { Command, PrefixSupplier } from 'discord-akairo';
import { Message } from 'discord.js';

export default class GuideCommand extends Command {
	public constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows info about how to use the bot.' }
		});
	}

	public async exec(message: Message) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Setup Guide', this.client.user!.displayAvatarURL(), 'https://clashperk.com')
			.setDescription([
				'**🔸 Step 1 : Live Boards and Logs**',
				'Create a new category (read-only for members) and get the bot access to it. Create 5 channels within that category (if you need all of live boards and logs)',
				'',
				'**Last Online Board**',
				`\`${prefix}setup lastonline <#clanTag>\``,
				'',
				'> Once you do that, you will get a message to verify that you actually are the Leader or Co-Leader of that clan, read and follow those instructions carefully. Verification is a one time process so you won\'t have to do it again for any other commands.',
				'',
				'**Clan Games Board**',
				`\`${prefix}setup clangames <#clanTag>\``,
				'',
				'**Donation Log**',
				`\`${prefix}setup donations <#clanTag>\``,
				'',
				'**Live War Board**',
				`\`${prefix}setup clan-wars <#clanTag>\``,
				'',
				'**Clan Feed (aka Clan Member Log)**',
				`\`${prefix}setup clan-feed <#clanTag> [@role]\``,
				'',
				'**🔸 Step 2 : Linking Clan**',
				`\`${prefix}link <#clanTag>\``,
				'',
				'> Once you link your clan, you won\'t have to type your clan tag for any other lookup commands.',
				'',
				`**🔸 For more commands type \\${prefix}help**`
			]);
		return message.util!.send({ embed });
	}
}
