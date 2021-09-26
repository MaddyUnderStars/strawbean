import * as Types from "../types"

export default new (class reload implements Types.Command {
	name = "rename";
	usage = "{reminder ID from list} {new name}";
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);

		var name = args || [];
		var id = parseInt(name.shift()) - 1;	//lol

		if (!name || !list[id])
			return { reply: "Sorry, you must provide a valid reminder ID, followed by the new name. Eg: `rename 1 vibe!`" };

		await Libs.reminders.rename(user._id, list[id]._id, name.join(" "));

		var ret = Libs.reminders.prettyPrint({ ...list[id], name: name.join(" ") });
		return { reply: { embeds: [{ ...ret.embeds[0], title: "Reminder renamed" }] } }

	}
})