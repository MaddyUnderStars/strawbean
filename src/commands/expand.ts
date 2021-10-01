import * as Types from "../types"

export default new (class expand implements Types.Command {
	name = "expand";
	usage = "{reminder ID from list | 'latest'}";
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id as string);

		var id: number;
		if (args[0] === "latest") id = Math.max.apply(0, list.map(x => x.remove_id));
		else id = parseInt(args[0]) - 1;

		if (!list[id])
			return { reply: "Sorry, you must provide a valid reminder ID. Check out the `list` command!" };

		var ret = Libs.reminders.prettyPrint({ ...list[id] });
		// ret.embeds[0].color = 0x0000ff;
		// ret.embeds[0].title = ret.embeds[0].description.split("`").join("");
		// ret.embeds[0].description = list[id].tag ? `Tag: \`${list[id].tag}\`` : "";
		// if (list[id].description)
		// 	ret.embeds[0].description = "\`" + list[id].description + "`";
		return { reply: Libs.reminders.prettyPrint({ ...list[id] }) }
	}
})