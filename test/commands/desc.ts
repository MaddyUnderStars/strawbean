import test from "ava";
import Discord from "discord.js";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("edit latest", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("remind desc test at 2:00PM", t.context.standardUser),
	);

	const ret = (await sendMessage(
		t.context.bot,
		new Message("desc latest test description", t.context.standardUser),
	)) as Discord.MessageOptions;

	t.is(ret?.embeds?.[0]?.description, "test description");
});

test("edit by id", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("remind desc test at 2:00PM", t.context.standardUser),
	);

	const ret = (await sendMessage(
		t.context.bot,
		new Message("desc 1 test description", t.context.standardUser),
	)) as Discord.MessageOptions;

	t.is(ret?.embeds?.[0]?.description, "test description");
});
