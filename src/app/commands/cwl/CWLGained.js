const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const Excel = require('exceljs');
const { emoji } = require('../../util/emojis');
const CWL = require('../../core/CWLWarTags');

class CWLGainedComamnd extends Command {
	constructor() {
		super('cwl-gained', {
			aliases: ['cwl-gained'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows gained and lost stars of clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--download', '-dl']
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		const excel = yield {
			match: 'flag',
			flag: ['--download', '-dl']
		};

		return { data, excel };
	}

	async exec(message, { data, excel }) {
		if (!excel) await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
				}
			});
		}

		const body = await res.json();

		if (!(body.state || res.ok)) {
			const cw = await CWL.get(data.tag);
			if (cw) {
				cw.rounds = cw.attributes['7-2020'];
				return this.rounds(message, cw, data, excel);
			}
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, data, excel);
	}

	async rounds(message, body, clan, excel) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const [members, clanTag] = [{}, clan.tag];

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (['inWar', 'warEnded'].includes(data.state)) {
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									lost: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}

							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
							}
						}
					}
					break;
				}
			}
		}

		const patron = this.client.patron.check(message.author, message.guild);
		const leaderboard = Object.values(members).sort((a, b) => (b.stars - b.lost) - (a.stars - a.lost));

		const embed = this.client.util.embed()
			.setAuthor(`${clan.name} CWL`, clan.badgeUrls.small)
			.setColor(this.client.embed(message))
			.setDescription([
				`**\`\u200e # STAR GAIN ${'NAME'.padEnd(15, ' ')}\`**`,
				leaderboard.filter(m => m.of > 0)
					.map((m, i) => {
						const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
						return `\`\u200e${(++i).toString().padStart(2, ' ')}  ${m.stars.toString().padEnd(2, ' ')}  ${gained.padStart(3, ' ')}  ${m.name.padEnd(15, ' ')}\``;
					})
					.join('\n')
			]);

		return message.util.send({
			embed,
			files: patron && excel
				? [{
					attachment: Buffer.from(await this.excel(members.filter(m => m.of > 0))),
					name: `${clan.name.toLowerCase()}_cwl_stars.xlsx`
				}]
				: null
		});
	}

	destruction(dest) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
	}

	attacks(num, team) {
		return num.toString().concat(`/${team}`);
	}

	winner(clan, opponent) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
	}

	async excel(members) {
		const workbook = new Excel.Workbook();
		workbook.creator = 'ClashPerk';
		workbook.lastModifiedBy = 'ClashPerk';
		workbook.created = new Date(2020, 1, 1);
		workbook.modified = new Date();
		workbook.lastPrinted = new Date();
		workbook.views = [
			{
				x: 0, y: 0, width: 10000, height: 20000,
				firstSheet: 0, activeTab: 1, visibility: 'visible'
			}
		];
		const sheet = workbook.addWorksheet('Member List');
		sheet.columns = [
			{ header: 'NAME', key: 'name', width: 16 },
			{ header: 'TAG', key: 'tag', width: 16 },
			{ header: 'STARS', key: 'th', width: 10 },
			{ header: 'DEFENCE', key: 'def', width: 10 },
			{ header: 'GAINED', key: 'gained', width: 10, style: { color: 'ff1010' } },
			{ header: 'DEST', key: 'bk', width: 10 },
			{ header: 'ATTACKS', key: 'aq', width: 10 }
		];
		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getColumn(1).alignment = { horizontal: 'left' };
		sheet.getColumn(2).alignment = { horizontal: 'left' };
		sheet.getColumn(3).alignment = { horizontal: 'right' };
		sheet.getColumn(4).alignment = { horizontal: 'right' };
		sheet.getColumn(5).alignment = { horizontal: 'right' };
		sheet.getColumn(6).alignment = { horizontal: 'right' };
		sheet.getColumn(7).alignment = { horizontal: 'right' };
		sheet.addRows(members.map(m => [m.name, m.tag, m.stars, m.lost, m.stars - m.lost, m.dest, `${m.attacks}/${m.of}`]));

		return workbook.xlsx.writeBuffer();
	}
}

module.exports = CWLGainedComamnd;
