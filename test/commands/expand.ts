import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("latest", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("remind expand test at 2:00PM", t.context.standardUser),
	);

	const ret = await sendMessage(
		t.context.bot,
		new Message("expand latest", t.context.standardUser),
	);

	if (ret.embeds?.[0].timestamp) ret.embeds[0].timestamp = 0;
	delete ret.id;

	t.snapshot(ret);
});

test("id", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("remind expand test at 2:00PM", t.context.standardUser),
	);

	const ret = await sendMessage(
		t.context.bot,
		new Message("expand 1", t.context.standardUser),
	);

	if (ret.embeds?.[0].timestamp) ret.embeds[0].timestamp = 0;
	delete ret.id;

	t.snapshot(ret);
});
