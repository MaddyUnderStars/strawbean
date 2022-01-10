import * as Types from "../types"
import parse from 'parse-duration'

export default new (class restore implements Types.Command {
	name = "restore";
	usage = "[id \"at\" [date || weekday] [time]] [{\"in\" || \"every\"} {time}]";
	help = "Restores a reminder that was deleted or sent within 24 hours.";
	examples = [
		"restore latest in 1 week",
		"restore 1 at 14/11/2021 5:00PM in 1 month",
	]
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var deleted = await Libs.reminders.getRecentlyDeleted(user._id) || [];
		deleted = Object.values(deleted).sort((a: Types.Reminder, b: Types.Reminder) => (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0))

		if (!args.length) {
			if (deleted.length === 0) return { reply: "You have no reminders in cache" }

			return {
				reply: "Showing recently sent/deleted reminders. To restore, provide ID and new time. eg: restore 1 1 week\n\n" +
					deleted.map((x, i) => `#${i + 1} : ${new Date(x.time).toLocaleString(user.locale, { timeZone: user.timezone })} : \`${x.name}\``).join("\n")
			}
		}

		var restored = deleted[parseInt(args.shift()) - 1]
		if (!restored) return { reply: "Please provide a valid ID to restore." };

		var time = args.join(" ")
		var parsed = Libs.language.parseString(" " + time, user.locale, user.timezone);

		Libs.reminders.reinstate(restored.owner, restored._id, parsed.seconds, parsed.offset || Date.now());

		return { reply: Libs.reminders.prettyPrint(restored) }
	}
})