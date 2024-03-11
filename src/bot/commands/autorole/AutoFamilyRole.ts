import { CommandInteraction, Guild, Role } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export interface IArgs {
	command?: 'refresh' | 'disable' | null;
	clans?: string;
	members?: Role;
	elders?: Role;
	coLeads?: Role;
	commonRole?: Role;
	verify: boolean;
	clear?: boolean;
}

export default class AutoFamilyRoleCommand extends Command {
	public constructor() {
		super('setup-family-roles', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: {
			command: string;
			family_role?: Role;
			guest_role?: Role;
			verified_role?: Role;
			type?: string;
		}
	) {
		if (args.command === 'disable') return this.disable(interaction, args.type);

		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const roles = [args.verified_role, args.guest_role, args.family_role];

		const selected = roles.filter((role) => role) as Role[];
		if (!selected.length) {
			return interaction.followUp({ content: 'You must select at least one role.', ephemeral: true });
		}

		if (selected.some((role) => this.isSystemRole(role, interaction.guild))) {
			const systemRoles = selected.filter((role) => this.isSystemRole(role, interaction.guild));
			return interaction.editReply(
				`${this.i18n('command.autorole.no_system_roles', { lng: interaction.locale })} (${systemRoles
					.map(({ id }) => `<@&${id}>`)
					.join(', ')})`
			);
		}

		if (selected.some((role) => this.isHigherRole(role, interaction.guild))) {
			return interaction.editReply(this.i18n('command.autorole.no_higher_roles', { lng: interaction.locale }));
		}

		if (args.family_role) {
			await this.client.settings.set(interaction.guild, Settings.FAMILY_ROLE, args.family_role.id);
		}

		if (args.guest_role) {
			await this.client.settings.set(interaction.guild, Settings.GUEST_ROLE, args.guest_role.id);
		}

		if (args.verified_role) {
			await this.client.settings.set(interaction.guild, Settings.ACCOUNT_VERIFIED_ROLE, args.verified_role.id);
		}

		this.client.storage.updateLinks(interaction.guildId);
		// TODO: Refresh Roles

		await interaction.editReply('Family role enabled successfully!');
	}

	private isSystemRole(role: Role, guild: Guild) {
		return role.managed || role.id === guild.id;
	}

	private isHigherRole(role: Role, guild: Guild) {
		return role.position > guild.members.me!.roles.highest.position;
	}

	private async disable(interaction: CommandInteraction<'cached'>, type?: string) {
		if (type === 'family') {
			this.client.settings.delete(interaction.guildId, Settings.FAMILY_ROLE);
		}
		if (type === 'guest') {
			this.client.settings.delete(interaction.guildId, Settings.GUEST_ROLE);
		}
		if (type === 'verified') {
			this.client.settings.delete(interaction.guildId, Settings.ACCOUNT_VERIFIED_ROLE);
		}
		return interaction.editReply(`Successfully disabled ${type} role.`);
	}
}
