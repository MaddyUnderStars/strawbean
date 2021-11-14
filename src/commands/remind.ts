import * as Types from "../types"

import dateFormats from '../asset/dateFormats.js'	//god, I hate this

export default new (class remind implements Types.Command {
	name = "remind";
	usage = "{description} [\"at\" [date || weekday] [time]] [{\"in\" || \"every\"} {time}]";
	help = "Creates a reminder that will be sent in this channel or in DM.";
	examples = [
		"remind me to hug somebody every 1 week",
		"remind love weekly",
		"remind send foxes to Maddy! at 14/11/2021 every fortnight",
		"remind go outside at monday 2:00 PM every week",
	]

	exec = async ({ user, args, Libs, msg }: Types.CommandContext) => {
		if (args[0] && args[0].toLowerCase() === "me") args.shift();

		var inGuild = false;
		if (args[0] && args[0].toLowerCase() === "here") {
			inGuild = !!msg.guild;	//lol
			args.shift();
		}

		if (args[0] && args[0].toLowerCase() === "to") args.shift();

		var parsed = Libs.language.parseString(args.join(" "), user.locale, user.timezone);

		if (!parsed) {
			const format = dateFormats[user.locale] || dateFormats[process.env.DEFAULT_LOCALE]
			return { reply: `We couldn't parse that, sorry. Make sure you're following the format \`${format} HH:MM (AM/PM)\`` }
		}

		if (parsed.repeating)
			if (!msg.guild || !msg.member.permissions.has("ADMINISTRATOR"))
				inGuild = false;

		if (!parsed.message) {
			await msg.reply("Sorry, what should the reminder's name be?");
			try {
				var m = await msg.channel.awaitMessages({
					filter: m => m.author.id === user._id,
					max: 1,
					time: 30000,
					errors: ["time"]
				})
				parsed.message = m.first().content;
			}
			catch (e) {
				return { reply: "Sorry, reply timed out." }
			}
		}

		if (!parsed.seconds && !parsed.offset) {
			await msg.reply("Sorry, when should your reminder be sent?");
			try {
				var m = await msg.channel.awaitMessages({
					filter: m => m.author.id === user._id,
					max: 1,
					time: 30000,
					errors: ["time"]
				})
				var attempt = Libs.language.parseString(" " + m.first().content, user.locale, user.timezone);
				delete attempt.message;
				Object.assign(parsed, attempt);
			}
			catch (e) {
				return { reply: "Sorry, reply timed out." }
			}
		}

		if (!parsed.seconds && !parsed.offset) {
			//ok so we're useless lets tell them
			return { reply: "Sorry, the time you entered couldn't be properly interpreted. Try using `remindme` without any arguments to use the extended flow." }
		}

		var ret = await Libs.reminders.add({
			owner: msg.author.id,
			name: parsed.message,
			time: parsed.seconds,
			repeating: parsed.repeating,
			url: msg.url,
			channel: inGuild ? msg.channel.id : null,
			setTime: !parsed.offset ? Date.now() : parsed.offset,
		})
		// in order to show the reminder id, we need to annoyingly call Libs.reminders.getAll() and find the newly created reminder
		var id = (await Libs.reminders.getAll(msg.author.id)).filter(x => x._id.toString() === ret._id.toString())[0].remove_id + 1
		var embed = Libs.reminders.prettyPrint(ret)
		embed.embeds[0].title = `#${id} Reminder set`

		return { reply: embed }
	}
})