import * as Types from "../types"

export default new (class remove implements Types.Command {
	name = "remove";
	usage = "{reminder ID from list | ( 'all' [tagName] )}";
	owner = true;
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id);

		var removed : Array<Types.Reminder & { i: number }> = [];

		for (var curr of (args[0] === "all"
			? (!args[1]
				? list.filter(x => x.tag !== "note").map(x => x.remove_id + 1)
				: list.filter(x => x.tag === args[1]).map(x => x.remove_id + 1))
			: args)) {
			const realId = parseInt(curr.toString()) - 1
			if (!list[realId]) continue;
			await Libs.reminders.remove(user._id, list[realId]._id)
			removed.push({ ...list[realId], i: realId })
		}

		return {
			reply: {
				embeds: [{
					title: `Deleted ${removed.length} reminders`,
					fields: removed.map(x => ({
						name: new Date(x.time).toLocaleString(user.locale, { timeZone: user.timezone }),
						value: `**#${x.i + 1}** : \`${x.name}\``,
						inline: true,
					})),
					color: 0xff0000,
				}]
			}
		}
	}
})