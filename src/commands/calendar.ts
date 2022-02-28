import * as Types from "../types";
import crypto from "crypto";

export default new (class calendar implements Types.Command {
	name = "calendar";
	usage = "";
	commandChainingLimit = 0;
	help = "Generates/displays your calendar URL for importing into Google Calendar or other services.";

	exec = async (context: Types.CommandContext) => {
		const { msg, args, user, Env } = context;
		if (user.calendarToken) {
			const channel = await msg.author.createDM();
			await channel.send({
				embeds: [{
					title: "Your calendar URL is:",
					description: `${process.env.CALENDAR_SERVICE_URL}/${user.calendarToken}`,
					url: `${process.env.CALENDAR_SERVICE_URL}/${user.calendarToken}`,
				}]
			});
			return;
		}

		if (!args.length || args[0] !== "generate") {
			return { reply: "To generate a calendar URL, rerun this command with `generate`." };
		}

		if (args[0] === "generate") {
			const collection = Env.db.collection("users");
			user.calendarToken = crypto.randomBytes(24).toString("hex");
			collection.updateOne({ _id: user._id }, { $set: { calendarToken: user.calendarToken } });
			return await this.exec(context);
		}
	};
});