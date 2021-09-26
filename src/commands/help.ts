import * as Types from "../types"

export default new (class help implements Types.Command {
	name = "help";
	usage = "";
	exec = async ({ args, Env }: Types.CommandContext) => {
		// if (Env.commands[args[0]])
		// 	return Env.commands[args[0]].help();

		return {
			reply: `**Command Directory.**\n\n` +
				Object.entries(Env.commands).filter(x => !x[1].owner).map(x => `\`${x[0]} ${x[1].usage}\``).join("\n")
		}
	}
})