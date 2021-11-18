import * as Types from "../types"

export default new (class search implements Types.Command {
	name = "search";
	usage = "[query]";
	help = "Searches your reminders and notes for anything that includes your query ( names, descriptions, time )";
	examples = [
		"search december",
		"search birthday",
		"search this is part of a "
	];
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var query = args.join(" ");

		const reminders = await Libs.reminders.search(user._id, query);
		const fields = reminders.map((x, i) => {
			var desc = !x.description ? "" : (`\n**Desc:** ${x.description.length > 25 ? x.description.substr(0, 25) + "..." : x.description}`);
			return {
				name: `**#${x.remove_id + 1}** : ${new Date(x.time).toLocaleString(user.locale, { timeZone: user.timezone })}`,
				value: `\`${x.name}\`${desc}`,
				inline: true,
			}
		});

		return {
			reply: {
				embeds: [{
					title: `${reminders.length} Total Reminders`,
					description: `Search results for query \`${query}\``,
					fields: fields,
					color: 0x0000ff,
				}]
			}
		}
	}
})