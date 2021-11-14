import * as Types from "../types"

export default new (class desc implements Types.Command {
	name = "desc";
	usage = "{id || 'latest'} {description}";
	help = "Change a reminder description";
	examples = [
		"desc 1 make sure you do the thing also!!",
		"desc latest also maybe you should do this?"
	]
	exec = async ({ user, args, Libs } : Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id as string)

		var desc = args || [];
		var id: number;
		if (desc[0] === "latest") id = Math.max.apply(0, list.map(x => x.remove_id)); 
		else id = parseInt(desc[0]) - 1;
		desc.shift();

		if (!desc || !list[id])
			return { reply: "Sorry, you must provide a valid reminder ID, followed by the description. Eg: `rename 1 you should vibe really hard!`" };

		await Libs.reminders.setDescription(user._id, list[id]._id, desc.join(" "));

		var ret = Libs.reminders.prettyPrint({ ...list[id] });
		return { reply: { embeds: [{ ...ret.embeds[0], title: "Reminder description set", description: desc.join(" ") }] } }
	}
})