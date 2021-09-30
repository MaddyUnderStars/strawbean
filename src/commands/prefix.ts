import * as Types from "../types"

export default new (class prefix implements Types.Command {
	name = "prefix";
	usage = "[new prefix. omit for default]";
	exec = async ({ user, guild, args, Env, msg }: Types.CommandContext) => {
		var { db } = Env;

		var newPrefix = args.length ? args.join(" ") : process.env.DEFAULT_PREFIX

		if (msg.guild && msg.member.permissions.has("ADMINISTRATOR")) {
			guild.prefix = newPrefix;
			await db.collection("guilds").updateOne({ _id: guild._id }, { $set: { prefix: newPrefix } });
			return { reply: `Updated server-wide prefix to \`${newPrefix}\`` }
		}
		else {
			return Env.commands["mefix"].exec({ user, args, Env, msg } as Types.CommandContext)
		}
	}
})