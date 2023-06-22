import * as Types from "../types";

export default new (class tag implements Types.Command {
	name = "tag";
	usage = '{id || "all" | "latest"} [tag]';
	help = "Tags a reminder. Provide no tag name to remove from a tag.";
	examples = ["tag latest school", "tag 1 school", "tag 1"];
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);

		var ids = args || [];
		var tag =
			ids.length > 1 && isNaN(parseInt(ids[ids.length - 1]))
				? ids.pop()
				: "";

		if (
			ids[0] !== "all" &&
			ids[0] !== "latest" &&
			(!list[parseInt(ids[0]) - 1] ||
				new Date(list[parseInt(ids[0]) - 1].time).toLocaleString() ===
					"Invalid Date")
		)
			return {
				reply:
					"Usage: `tag [id] [...id] [tag name]`\n" +
					"Eg:\n* `tag 1 2 3 example`\n* `tag all test`\n\nto remove, provide no tag name.\nYou cannot tag items that were originally notes.",
			};

		var filteredIds: number[] = [];
		if (ids[0] === "all")
			filteredIds = list
				.filter((x) => x.tag !== "note")
				.map((x) => x.remove_id + 1);
		else if (ids[0] === "latest")
			filteredIds = [
				Math.max.apply(
					0,
					list.map((x) => x.remove_id + 1),
				),
			];
		else filteredIds = ids.map((x) => parseInt(x));

		if (tag === "notes") tag = "note"; //lol

		var tagged = [];
		for (var curr of filteredIds) {
			var realId = parseInt(curr.toString()) - 1;
			if (new Date(list[realId].time).toLocaleString() === "Invalid Date")
				continue;
			await Libs.reminders.setTag(user._id, list[realId]._id, tag);
			tagged.push(realId);
		}

		//lol whats optimisation
		list = await Libs.reminders.getAll(user._id);
		return {
			reply: {
				embeds: [
					{
						title: "Reminder(s) tagged",
						description:
							`Tagged: ${tagged
								.map((x) => `#${x + 1}`)
								.join(", ")}\n\n` +
							`There are ${
								list.filter((x) => x.tag === tag).length
							} items in this tag`,
						color: 0x00ff00,
					},
				],
			},
		};
	};
})();
