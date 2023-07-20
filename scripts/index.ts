import crypto from 'crypto';
import { inspect } from 'util';
import { RESTPostAPIApplicationCommandsJSONBody, RouteBases, Routes } from 'discord.js';
import fetch from 'node-fetch';
import 'reflect-metadata';
import { ALPHA_COMMANDS, BETA_COMMANDS, COMMANDS, PRIVATE_COMMANDS } from './Commands.js';

const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();

const masterGuilds = ['609250675431309313', '1016659402817814620', '509784317598105619'];

console.log(new Date().toISOString());

export const decrypt = (value: string) => {
	const key = Buffer.from(process.env.CRYPTO_KEY!, 'hex');
	const iv = Buffer.from(process.env.CRYPTO_IV!, 'hex');
	const decipher = crypto.createDecipheriv('aes256', key, iv);
	return Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]).toString();
};

const applicationGuildCommands = async (token: string, guildId: string, commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
	console.log(`Building guild application commands for ${guildId}`);
	const res = await fetch(`${RouteBases.api}${Routes.applicationGuildCommands(getClientId(token), guildId)}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${COMMANDS.length} Guild Application Commands`);
};

const applicationCommands = async (token: string, commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
	console.log('Building global application commands', getClientId(token));
	const res = await fetch(`${RouteBases.api}${Routes.applicationCommands(getClientId(token))}`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands)
	});
	await res.json().then((data) => (res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))));
	console.log(`Updated ${commands.length} Application Commands`);
};

const customBotCommands = async (commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
	const res = await fetch(`${process.env.SERVICE_API_URL!}/applications`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${process.env.SERVICE_API_KEY!}`,
			'Content-Type': 'application/json'
		}
	});

	const body = (await res.json()) as { payload: string };
	if (!body.payload) console.log(body);

	const applications = JSON.parse(decrypt(body.payload)) as { applicationId: string; token: string; guildIds: string[] }[];
	for (const application of applications) {
		for (const guildId of application.guildIds) {
			await applicationGuildCommands(application.token, guildId, commands);
		}
	}
};

(async () => {
	const token = process.env.BOT_TOKEN!;
	if (process.argv.includes('--gh-action')) {
		return applicationCommands(token, [...COMMANDS, ...ALPHA_COMMANDS]);
	}

	if (process.argv.includes('--delete')) {
		const guilds = process.env.GUILD_IDS!.split(',');
		for (const guildId of guilds) {
			await applicationGuildCommands(process.env.PROD_TOKEN!, guildId, []);
		}
		return;
	}

	if (process.argv.includes('--beta')) {
		const guilds = process.env.GUILD_IDS!.split(',');
		for (const guildId of new Set(guilds)) {
			const commands = masterGuilds.includes(guildId)
				? [...BETA_COMMANDS, ...ALPHA_COMMANDS, ...PRIVATE_COMMANDS]
				: [...BETA_COMMANDS];
			await applicationGuildCommands(process.env.PROD_TOKEN!, guildId, commands);
		}
		return;
	}

	if (process.argv.includes('--custom-bot')) {
		await customBotCommands([...COMMANDS]);
		return;
	}

	return applicationCommands(token, [...COMMANDS, ...BETA_COMMANDS, ...ALPHA_COMMANDS, ...PRIVATE_COMMANDS]);
	// return applicationCommands(token, []);
})();
