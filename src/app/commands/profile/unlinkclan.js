const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');
const firebase = require('firebase-admin');

class UnlinkClanCommand extends Command {
	constructor() {
		super('unlinkclan', {
			aliases: ['unlinkclan'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'EMBED_LINKS'],
			description: {
				content: 'Unlinks your clan from your Discord ID.',
				usage: '<profile/clan>',
				examples: ['profile', 'clan']
			},
			args: [
				{
					id: 'member',
					type: 'guildMember',
					default: message => message.member
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { member }) {
		const deleted = await this.delele(member.id);
		if (!deleted) {
			return message.util.send({
				embed: {
					color: 3093046,
					description: `Couldn\'t find a clan linked to **${member.user.tag}**!`
				}
			});
		}

		const embed = this.client.util.embed()
			.setColor(0x10ffc1)
			.setAuthor('Successfully Deleted');
		return message.util.send({ embed });
	}

	async delele(id) {
		const batch = firestore.batch();
		const deleted = await firestore.collection('linked_accounts')
			.doc(id)
			.get()
			.then(snap => {
				const data = snap.data();
				if (data && data.clan) {
					batch.update(snap.ref, {
						clan: firebase.firestore.FieldValue.delete()
					}, { merge: true });
					batch.commit();
					return true;
				}
				return false;
			});
		return deleted;
	}
}
module.exports = UnlinkClanCommand;
