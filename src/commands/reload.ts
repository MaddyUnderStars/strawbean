import * as Types from "../types"

export default new (class reload implements Types.Command {
	name = "reload";
	usage = "";
	owner: true;
	exec = async ({ args, Env }: Types.CommandContext) => {
		var file = "./" + args[0] + ".js";
		// delete require.cache[require.resolve(file)]; //theres no alternative to this in typescript, afaik
		var imported = (await import(file)).default
		Env.commands[imported.name.toLowerCase()] = imported;

		return { reply: `Reloaded \`${imported.name}\``}
	}
})