import * as Types from "../types"

export default new (class tag implements Types.Command {
	name = "tag";
	usage = "{reminder ID from list | 'all'} [tag]";
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);

		var ids = args || [];
		var tag = ids.length > 1 && isNaN(parseInt(ids[ids.length - 1])) ? ids.pop() : "";

		if (ids[0] !== "all" &&
			(!list[parseInt(ids[0]) - 1] ||
				(new Date(list[parseInt(ids[0]) - 1].time)).toLocaleString() === "Invalid Date")
		)
			return {
				reply: "Usage: `tag [id] [...id] [tag name]`\n" +
					"Eg:\n* `tag 1 2 3 example`\n* `tag all test`\n\nto remove, provide no tag name.\nYou cannot tag items that were originally notes."
			}

		var tagged = []
		for (var curr of (ids[0] === "all" ? list.filter(x => x.tag !== "note").map(x => x.remove_id + 1) : ids)) {
			if (curr === "all") continue;	//don't want to
			var realId = parseInt(curr.toString()) - 1;
			if ((new Date(list[realId].time)).toLocaleString() === "Invalid Date") continue;
			await Libs.reminders.setTag(user._id, list[realId]._id, tag);
			tagged.push(realId);
		}

		//lol whats optimisation
		list = await Libs.reminders.getAll(user._id);
		return {
			reply: {
				embeds: [{
					title: "Reminder(s) tagged",
					description: `Tagged: ${tagged.map(x => `#${x + 1}`).join(", ")}\n\n` +
						`There are ${list.filter(x => x.tag === tag).length} items in this tag`,
					color: 0x00ff00,
				}]
			}
		}
	}
})