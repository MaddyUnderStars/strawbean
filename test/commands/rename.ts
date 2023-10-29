import test from "ava";
import { GuildMember, Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("rename latest example reminder", async (t: Context) => {
	const user = new GuildMember();
	for (var i = 0; i < 10; i++) {
		await sendMessage(
			t.context.bot,
			new Message("remindme test in 1 year", user),
		);
		await sendMessage(
			t.context.bot,
			new Message("rename latest example reminder", user),
		);
	}

	const reminders = await t.context.bot.Env.libs.reminders.getAll(user.id);
	for (var reminder of reminders) {
		t.is(reminder.name, "example reminder", "reminder was not renamed");
	}
});

test("rename 1 example reminder", async (t: Context) => {
	const user = new GuildMember();
	await sendMessage(
		t.context.bot,
		new Message("remindme test in 1 year", user),
	);
	await sendMessage(
		t.context.bot,
		new Message("rename 1 example reminder", user),
	);
	const reminders = await t.context.bot.Env.libs.reminders.getAll(user.id);
	t.is(reminders[0].name, "example reminder", "reminder was not renamed");
});
