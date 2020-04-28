const fetch = require('node-fetch');
const { mongodb } = require('./Database');
const { status } = require('../util/constants');
const { MessageEmbed } = require('discord.js');

class Fetch {
	static async resolve(message, args) {
		const member = this.isMember(message, args);
		if (member) {
			const data = await mongodb.db('clashperk')
				.collection('linkedaccounts')
				.findOne({ tag: args });

			if (data) return this.player(data.tag);
		}

		return this.player(args);
	}

	static async resolveclan(message, args) {
		const member = this.isMember(message, args);
		if (member) {
			const data = await mongodb.db('clashperk')
				.collection('linkedclans')
				.findOne({ tag: args });

			if (data) return this.clan(data.tag);
		}

		return this.clan(args);
	}

	static isMember(message, args) {
		if (!args) return null;
		const mention = args.match(/<@!?(\d{17,19})>/);
		const id = args.match(/^\d+$/);
		if (id) return message.guild.members.cache.get(id[0]) || null;
		if (mention) return message.guild.members.cache.get(mention[1]) || null;
		return null;
	}

	static async player(str) {
		const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data);
	}

	static async clan(str) {
		const tag = `#${str.toUpperCase().replace(/O/g, '0').replace(/#/g, '')}`;
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET', timeout: 3000, headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11);

		if (!res) return { status: 504, embed: embed.setDescription(status(504)) };
		if (!res.ok) return { status: res.status || 504, embed: embed.setDescription(status(res.status || 504)) };
		const data = await res.json();
		return this.assign(data);
	}

	static assign(data) {
		return Object.assign({ status: 200 }, data);
	}
}

module.exports = Fetch;
