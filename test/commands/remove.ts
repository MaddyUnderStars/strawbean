import test from "ava";
import { GuildMember, Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("remove all", async (t: Context) => {
	const user = new GuildMember();
	for (var i = 0; i < 10; i++) {
		await sendMessage(
			t.context.bot,
			new Message("remindme test in 1 year", user),
		);
	}

	const msg = new Message("remove all", user);
	await sendMessage(t.context.bot, msg);

	const reminders = await t.context.bot.Env.libs.reminders.getAll(
		msg.author.id,
	);
	if (reminders.length) debugger;
	t.falsy(reminders.length, "not all reminders were deleted");
});
