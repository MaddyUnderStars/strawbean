import * as Types from "../types";

export default new (class alias implements Types.Command {
	name = "alias";
	usage = "{alias} [original command]";
	help = "Create or delete command aliases.";
	examples = [
		"alias school remind temp week; tag latest school; rename latest",
	];
	exec = async ({ user, args, Env }: Types.CommandContext) => {
		var { db } = Env;

		if (!args[0])
			return {
				reply:
					`\n**Aliases:**\n` +
					`${Object.entries(user.alias)
						.map((x) => `\`${x[0]}\` = \`${x[1]}\``)
						.join("\n")}\n` +
					`**Default aliases ( cannot be removed ):**\n` +
					`${Object.entries(Env.defaultAliases)
						.map((x) => `\`${x[0]}\` = \`${x[1]}\``)
						.join("\n")}`,
			};

		var alias = args[0];
		var cmd = args.splice(1).join(" ");

		if (!cmd) delete user.alias[alias];
		else user.alias[alias] = cmd;

		await db
			.collection("users")
			.updateOne({ _id: user._id }, { $set: { alias: user.alias } });
		return {
			reply: cmd
				? `Alias set \`${alias}\` = \`${cmd}\``
				: `Alias for \`${alias}\` deleted`,
		};
	};
})();
