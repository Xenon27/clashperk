const firebase = require('firebase-admin');
const { MongoClient } = require('mongodb');

const firebaseApp = firebase.initializeApp({
	credential: firebase.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
	}),
	databaseURL: process.env.FIREBASE_DBURL
});

class MongoDB extends MongoClient {
	constructor() {
		super(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
	}

	async init() {
		return this.connect();
	}
}

const mongodb = new MongoDB();

class Database {
	static get firebase() {
		return firebaseApp.database();
	}

	static get firestore() {
		return firebaseApp.firestore();
	}

	static async connect(client) {
		return mongodb.init().then(() => {
			client.logger.info('MongoDB Connected', { label: 'MONGODB' });
			return mongodb;
		});
	}

	static get mongodb() {
		return mongodb;
	}

	static async createIndex() {
		const db = mongodb.db('clashperk');
		return Promise.all([
			db.collection('clanstores').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('donationlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('lastonlinelogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('lastonlines').createIndex({ tag: 1 }, { unique: true }),

			db.collection('clangameslogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('clanembedlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('flaggedusers').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('linkedclans').createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection('linkedusers').createIndex({ user: 1, tag: 1 }, { unique: true }),

			db.collection('playerlogs').createIndex({ guild: 1, tag: 1 }, { unique: true }),

			db.collection('settings').createIndex({ id: 1 }, { unique: true }),

			db.collection('clanwars').createIndex({ clan_id: 1 }, { unique: true }),

			db.collection('clanwarstores').createIndex({ 'clan.tag': 1, 'opponent.tag': 1, 'warID': -1 }, { unique: true }),

			db.collection('clanwarstores').createIndex({ preparationStartTime: -1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),

			db.collection('clanstores').createIndex({ patron: 1 }),

			db.collection('clangames').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 20 * 24 * 60 * 60 }),

			db.collection('clangames').createIndex({ tag: 1 }, { unique: true }),

			db.collection('cwlwartags').createIndex({ tag: 1 }, { unique: true }),

			db.collection('cwlwartags').createIndex({ createdAt: 1 }, { expireAfterSeconds: 45 * 24 * 60 * 60 }),

			db.collection('clanmembers').createIndex({ createdAt: -1 }, { expireAfterSeconds: 120 * 24 * 60 * 60 }),

			db.collection('clanmembers').createIndex({ tag: 1, season: -1, clanTag: 1 }, { unique: true })
		]);
	}
}

module.exports = Database;
