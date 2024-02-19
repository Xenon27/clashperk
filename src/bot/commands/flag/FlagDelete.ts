import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { Filter, ObjectId } from 'mongodb';
import { FlagsEntity } from '../../entities/flags.entity.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class FlagDeleteCommand extends Command {
	public constructor() {
		super('flag-delete', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true
		});
	}

	public async autocomplete(
		interaction: AutocompleteInteraction<'cached'>,
		args: { player_tag?: string; flag_ref?: string; flag_type?: 'ban' | 'strike' }
	) {
		const focused = interaction.options.getFocused(true);
		if (focused.name === 'flag_ref') {
			if (!args.player_tag) return interaction.respond([{ name: 'Select a player first!', value: '0' }]);

			const playerTag = this.client.http.fixTag(args.player_tag);
			const flags = await this.client.db
				.collection<FlagsEntity>(Collections.FLAGS)
				.find({
					guild: interaction.guild.id,
					tag: playerTag,
					flagType: args.flag_type ?? undefined,
					$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
				})
				.sort({ _id: -1 })
				.toArray();

			const refIds = flags
				.map((flag) => ({
					name: `${flag._id.toHexString().substr(-5).toUpperCase()} - ${flag.reason}`.substring(0, 100),
					value: flag._id.toHexString(),
					refId: flag._id.toHexString().substr(-5).toUpperCase()
				}))
				.filter(({ refId }) => (args.flag_ref ? refId === args.flag_ref.toUpperCase() : true))
				.slice(0, 24);

			refIds.unshift({ name: 'All Flags', value: '*', refId: '*' });
			return interaction.respond(refIds.map(({ name, value }) => ({ name, value })));
		}

		return this.client.autocomplete.flagSearchAutoComplete(interaction, args);
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { player_tag: string; flag_type: 'ban' | 'strike'; flag_ref?: string }
	) {
		if (!args.player_tag) return interaction.editReply(this.i18n('command.flag.delete.no_tag', { lng: interaction.locale }));
		const playerTag = this.client.http.fixTag(args.player_tag);

		const filter: Filter<FlagsEntity> = {
			guild: interaction.guild.id,
			tag: playerTag,
			flagType: args.flag_type,
			$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
		};

		const collection = this.client.db.collection<FlagsEntity>(Collections.FLAGS);
		const flags = await collection.find(filter).sort({ _id: -1 }).toArray();
		if (!flags.length) {
			return interaction.editReply(this.i18n('command.flag.delete.no_result', { lng: interaction.locale, tag: playerTag }));
		}

		if (args.flag_ref && args.flag_ref !== '*') {
			const flagIds = flags.map((flag) => flag._id.toHexString());
			if (!flagIds.includes(args.flag_ref)) {
				return interaction.editReply('Invalid flag reference was provided.');
			}
			filter._id = new ObjectId(args.flag_ref);
		}

		const refId = filter._id ? filter._id.toHexString?.().toUpperCase().substr(-5) : null;

		await collection.deleteMany(filter);
		return interaction.editReply(
			this.i18n('command.flag.delete.success', {
				lng: interaction.locale,
				tag: `${playerTag}${refId ? ` and ref \`${refId}\`` : ''}`
			})
		);
	}
}
