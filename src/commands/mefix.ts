import * as Types from "../types"

export default new (class mefix implements Types.Command {
	name = "mefix";
	usage = "[new prefix. omit for default]";
	exec = async ({ user, args, Env }: Types.CommandContext) => {
		var { db } = Env;

		var newPrefix = args.length ? args.join(" ") : "%"

		user.prefix = newPrefix;
		await db.collection("users").updateOne({ _id: user._id }, { $set: { prefix: newPrefix } });
		return { reply: `Updated personal prefix to \`${newPrefix}\`` }
	}
})