const https = require("https");
const { emoji } = require("../util/emojis");

class MaintenanceHandler {
	constructor(client) {
		this.client = client;
		this.isMaintenance = Boolean(false);
	}

	init() {
		return https.request("https://api.clashofclans.com/v1/locations?limit=1", {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${process.env.DEVELOPER_TOKEN}`,
				"Content-Type": "application/json"
			}
		}, async res => {
			setTimeout(this.init.bind(this), 30 * 1000);
			if (res.statusCode === 503 && !this.isMaintenance) {
				this.isMaintenance = Boolean(true);
				this.client.cacheHandler.flush();
				return this.send();
			}
			if (res.statusCode === 200 && this.isMaintenance) {
				this.isMaintenance = Boolean(false);
				await this.client.cacheHandler.flush();
				await this.client.cacheHandler.init();
				return this.send();
			}
		}).end();
	}

	async send() {
		if (this.isMaintenance) {
			return this.client.channels.cache.get("609074828707758150").send(`**${emoji.clash} Maintenance Break Started!**`);
		}

		if (!this.isMaintenance) {
			return this.client.channels.cache.get("609074828707758150").send(`**${emoji.clash} Maintenance Break is Over!**`);
		}
	}
}

module.exports = MaintenanceHandler;
