import * as Types from "../types"

export default new (class timezone implements Types.Command {
	name = "timezone";
	usage = "{timezone}";
	help = "Changes your timezone. See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones";
	examples = [
		"timezone Australia/Sydney",
		"timezone Australia/Queensland",
		"timezone America/Los_Angeles",
		"timezone UTC"
	]
	exec = async ({ user, args, Env }: Types.CommandContext) => {
		if (!args[0]) args[0] = process.env.DEFAULT_TIMEZONE;

		try {
			(new Date).toLocaleTimeString(undefined, { timeZone: args[0] });
		}
		catch (e) {
			return { reply: "Invalid timezone string" }
		}

		user.timezone = args[0];
		Env.db.collection("users").updateOne({ _id: user._id }, { $set: { timezone: user.timezone } });
		return { reply: `Timezone set to \`${user.timezone}\`` }
	}
})