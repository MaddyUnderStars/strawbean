import * as Types from "../types";

export default new (class mefix implements Types.Command {
	name = "mefix";
	usage = "[new prefix. omit for default]";
	help =
		"Changes your personal prefix. Your personal prefix is constant in all servers, regardless of server prefix.";
	examples = ["mefix %"];
	exec = async ({ user, args, Env }: Types.CommandContext) => {
		var { db } = Env;

		var newPrefix = args.length
			? args.join(" ")
			: process.env.DEFAULT_PREFIX;

		user.prefix = newPrefix;
		await db
			.collection<Types.User>("users")
			.updateOne({ _id: user._id }, { $set: { prefix: newPrefix } });
		return { reply: `Updated personal prefix to \`${newPrefix}\`` };
	};
})();
