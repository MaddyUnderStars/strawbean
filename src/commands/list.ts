import * as Types from "../types";

export default new (class list implements Types.Command {
	name = "list";
	usage = '["all" || tagName || "!"tagName]';
	commandChainingLimit = 0;
	help =
		"Lists all reminders, reminders in/outside a tag, or reminders for the current server.";
	examples = ["list all", "list school", "list !school", "list"];
	exec = async ({ user, Libs, args, msg }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);
		list = list.sort((a, b) =>
			a.time > b.time ? 1 : b.time > a.time ? -1 : 0,
		);

		var reply =
			"Showing reminders for current server. To show all, use `list all`.";

		var tag = args.join(" ");
		if (msg.guild ? !tag : false)
			//if we're in a guild, filter by channel if no tag provided
			list = list.filter((x) => msg.guild.channels.resolve(x.channel));
		else if (tag.length > 0 && tag !== "all") {
			//otherwise, if a tag was provided filter by tag
			if (tag.startsWith("!")) {
				//exclude tag
				list = list.filter(
					(x) => x.tag !== args[0].slice(1) && x.tag !== "note",
				);
				reply =
					"Showing reminders *not* tagged with `" +
					args[0].slice(1) +
					"`";
			} else {
				list = list.filter((x) => x.tag === args[0]);
				reply = "Showing reminders tagged with `" + args[0] + "`";
			}
		} else {
			//if tag was 'all'
			list = list.filter((x) => x.tag !== "note");
			reply = "Showing reminders for every channel/server.";
		}

		if (list.length === 0) reply += "\n\n**You have no reminders here.**";

		var fields = [];
		if (tag === "note" || tag === "notes")
			fields = list.map((x, i) => {
				//zero width space
				var desc = !x.description
					? "\u200b"
					: `${
							x.description.length > 25
								? x.description.substr(0, 25) + "..."
								: x.description
					  }`;
				return {
					name: `**#${x.remove_id + 1}** : \`${x.name}\``,
					value: desc,
					inline: true,
				};
			});
		else
			fields = list.map((x, i) => {
				var desc = !x.description
					? ""
					: `\n**Desc:** ${
							x.description.length > 25
								? x.description.substr(0, 25) + "..."
								: x.description
					  }`;
				return {
					name: `**#${x.remove_id + 1}** : ${new Date(
						x.time,
					).toLocaleString(user.locale, {
						timeZone: user.timezone,
					})}`,
					value: `\`${x.name}\`${desc}`,
					inline: true,
				};
			});

		if (list.length !== 0 && fields.length > 25) {
			return {
				reply:
					`You have ${list.length} reminders, which will not fit in an embed.\n\n` +
					fields.map((x) => `**${x.name}** : ${x.value}`).join("\n"),
			};
		}

		return {
			reply: {
				embeds: [
					{
						title: `${list.length} Total Reminders`,
						description: reply,
						fields: fields,
						color: 0x0000ff,
					},
				],
			},
		};
	};
})();
