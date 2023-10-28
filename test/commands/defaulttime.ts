import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("set default time", async (t: Context) => {
	const set = await sendMessage(
		t.context.bot,
		new Message("defaulttime at 2:00PM", t.context.standardUser),
	);

	t.assert(set.toString().includes("2:00PM"));
});

test("remove default time", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("defaulttime at 2:00PM", t.context.standardUser),
	);

	const remove = await sendMessage(
		t.context.bot,
		new Message("defaulttime", t.context.standardUser),
	);

	t.assert(remove.toString().includes("removed"));
});

// todo: create a reminder with a default time and check time
