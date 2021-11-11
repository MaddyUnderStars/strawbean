import * as Types from "../types"

export default new (class time implements Types.Command {
	name = "time";
	usage = "{reminder ID from list | 'latest'} [\"at\" [date] [time]] [{\"in\" || \"every\"} {time}]";
	exec = async ({ user, args, Libs }: Types.CommandContext) => {
		var list = await Libs.reminders.getAll(user._id as string)

		var rawTimeString = args || [];
		var id: number;
		if (rawTimeString[0] === "latest") id = Math.max.apply(0, list.map(x => x.remove_id));
		else id = parseInt(rawTimeString[0]) - 1;
		rawTimeString.shift();

		if (!rawTimeString || !list[id])
			return { reply: "Sorry, you must provide a valid reminder ID, followed by the description. Eg: `time 1 in 1 second!`" };

		var parsed = Libs.language.parseString(" " + rawTimeString.join(" "), user.locale, user.timezone);

		await Libs.reminders.setTime(user._id, list[id]._id, parsed.seconds, parsed.offset);
		list = await Libs.reminders.getAll(user._id as string)

		var embed = Libs.reminders.prettyPrint({ ...list[id] })
		embed.embeds[0].title = `#${id + 1} Reminder time set`
		return { reply: embed };
	}
})