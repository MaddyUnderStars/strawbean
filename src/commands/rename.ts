import * as Types from "../types";

export default new (class reload implements Types.Command {
	name = "rename";
	usage = '{id || "latest"} {new name}';
	help = "";
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);

		var name = args || [];
		var id: number;
		if (name[0] === "latest")
			id = Math.max.apply(
				0,
				list.map((x) => x.remove_id),
			);
		else id = parseInt(name[0]) - 1;
		name.shift();

		if (!name || !list[id])
			return {
				reply: "Sorry, you must provide a valid reminder ID, followed by the new name. Eg: `rename 1 vibe!`",
			};

		await Libs.reminders.rename(user._id, list[id]._id, name.join(" "));

		var ret = Libs.reminders.prettyPrint({
			...list[id],
			name: name.join(" "),
		});
		return {
			reply: {
				embeds: [{ ...ret.embeds[0], title: "Reminder renamed" }],
			},
		};
	};
})();
