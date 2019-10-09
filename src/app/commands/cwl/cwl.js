const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');
const { stripIndents, stripIndent } = require('common-tags');

const TownHallEmoji = {
	2: '<:townhall2:534745498561806357>',
	3: '<:townhall3:534745539510534144>',
	4: '<:townhall4:534745571798286346>',
	5: '<:townhall5:534745574251954176>',
	6: '<:townhall6:534745574738624524>',
	7: '<:townhall7:534745575732805670>',
	8: '<:townhall8:534745576802353152>',
	9: '<:townhall9:534745577033039882>',
	10: '<:townhall10:534745575757709332>',
	11: '<:townhall11:534745577599270923>',
	12: '<:townhall12:534745574981894154>'
};

const heroes = [
	'<:townhall:631389478568591370>',
	'<:barbarianking:524939911581663242>',
	'<:archerqueen:524939902408720394>',
	'<:grandwarden:524939931303411722>'
];

class CwlComamnd extends Command {
	constructor() {
		super('cwl', {
			aliases: ['cwl-warmap'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'CWL warmap command.',
				usage: '<tag>',
				examples: ['']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'What would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 2000;
		return 15000;
	}

	async exec(message, { data }) {
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const clan = await res.json();

		const memberList = [];
		for (const { tag } of clan.clans.find(clan => clan.tag === data.tag).members) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();
			memberList.push({
				tag: member.tag,
				name: member.name,
				townHallLevel: member.townHallLevel,
				heroes: member.heroes.filter(a => a.village === 'home')
			});
		}

		let members = '';
		// let index = 0;
		const embed = this.client.util.embed()
			.setTitle(stripIndent`${heroes[0]}    ${heroes[1]}    ${heroes[2]}    ${heroes[3]}    PLAYER`);

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += stripIndent`\`${TownHallEmoji[member.townHallLevel]}    ${member.heroes.map(x => x.level).join('  \u200b  ')}    \`${member.name}`;
			members += '\n';
			this.heroLevel(member.heroes);
		}

		console.log(members.length);

		const result = this.split(members);
		if (Array.isArray(result)) {
			embed.setDescription([result[0], result[1]])
				.addField('\u200b', result[2]);
		}

		return message.channel.send({ embed });
	}

	chunk(items = []) {
		const chunk = 10;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	heroLevel(items = []) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].level < 10) {
				items[i].level.toString().padStart(2, 0);
			}
		}
		console.log(items);
		return Object.assign([
			{ level: '00' },
			{ level: '00' },
			{ level: '00' }
		], items);
	}

	split(content) {
		return Util.splitMessage(content, { maxLength: 1024 });
	}
}

module.exports = CwlComamnd;
