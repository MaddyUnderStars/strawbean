import * as Types from "../types"

export default new (class desc implements Types.Command {
	name = "desc";
	usage = "{reminder ID from list} {description}";
	exec = async ({ user, args, Libs } : Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id as string)

		var desc = args || [];
		var id = parseInt(desc.shift()) - 1;	//lol

		if (!desc || !list[id])
			return { reply: "Sorry, you must provide a valid reminder ID, followed by the description. Eg: `rename 1 you should vibe really hard!`" };

		await Libs.reminders.setDescription(user._id, list[id]._id, desc.join(" "));

		var ret = Libs.reminders.prettyPrint({ ...list[id] });
		return { reply: { embeds: [{ ...ret.embeds[0], title: "Reminder description set", description: desc.join(" ") }] } }
	}
})