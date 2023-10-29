import test from "ava";
import {
	GuildMember,
	Message,
	sendMessage,
	testReminder,
} from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("latest in 1 week", async (t: Context) => {
	const user = new GuildMember();
	const ret = await sendMessage(
		t.context.bot,
		new Message("remindme test in 5 years", user),
	);

	await testReminder.exec(
		t,
		new Message("time latest in 1 week", user),
		new Date(new Date().setDate(new Date().getDate() + 7)),
		false,
	);
});
