import { container } from 'tsyringe';
import Client from './Client.js';

export class CommandsMap {
	public commands: Map<string, string>;
	public client: Client;

	public constructor() {
		this.commands = new Map();
		this.client = container.resolve(Client);
	}

	public get() {
		return {
			SETUP_ENABLE: this.client.getCommand('/setup enable'),
			LINK_CREATE: this.client.getCommand('/link create'),
			REDEEM: this.client.getCommand('/redeem'),
			VERIFY: this.client.getCommand('/verify')
		};
	}
}
