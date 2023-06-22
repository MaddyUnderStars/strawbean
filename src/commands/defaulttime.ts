import prettyMilliseconds from "pretty-ms";
import * as Types from "../types";

export default new (class defaulttime implements Types.Command {
	name = "defaulttime";
	usage = '["at" [date || weekday] [time]] [{"in" || "every"} {time}]';
	help =
		"Set a default time for reminders, to be used when no time is provided.";
	examples = [
		"defaulttime at 5:00PM",
		"defaulttime in 1 hour",
		"defaulttime at 4:00PM tomorrow",
		"defaulttime daily",
	];
	exec = async ({ user, args, Libs, Env }: Types.CommandContext) => {
		const time = args.join(" ");

		if (!time) {
			await Env.db.collection("users").updateOne(
				{ _id: user._id },
				{
					$set: {
						defaultTime: null,
					},
				},
			);
			user.defaultTime = null;

			return {
				reply: "Your default time string, if any, has been removed. If you're lost, try `help defaulttime`",
			};
		}

		const parsed = Libs.language.parseString(
			" " + time,
			user.locale,
			user.timezone,
		);

		if (!parsed) return { reply: "Sorry, that input couldn't be parsed." };

		user.defaultTime = time;
		await Env.db.collection("users").updateOne(
			{ _id: user._id },
			{
				$set: {
					defaultTime: time,
				},
			},
		);

		const date = new Date(
			(parsed.offset || Date.now()) + parsed.seconds,
		).toLocaleString(user.locale, {
			timeZone: user.timezone,
		});

		return {
			reply:
				`Your default time string has been set to \`${time}\`.\n` +
				`If you were to create a reminder using this, it would send at \`${date}\`` +
				(parsed.repeating
					? `, repeating every \`${prettyMilliseconds(
							parsed.seconds,
							{
								verbose: true,
							},
					  )}\``
					: ""),
		};
	};
})();
