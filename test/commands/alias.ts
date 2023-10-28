import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("defaults are listed", async (t: Context) => {
	const ret = await sendMessage(t.context.bot, new Message("alias"));
	const content = ret.toString();
	const defaults = t.context.bot.Env.defaultAliases;
	t.assert(
		Object.entries(defaults).every(
			(alias) => content.includes(alias[0]) && content.includes(alias[1]),
		),
	);
});

test("set", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("alias a alias", t.context.standardUser),
	);

	const use = await sendMessage(
		t.context.bot,
		new Message("a", t.context.standardUser),
	);
	t.assert(use.toString().includes("a"));
	t.assert(use.toString().includes("alias"));
});

test("remove", async (t: Context) => {
	await sendMessage(
		t.context.bot,
		new Message("alias toberemoved alias", t.context.standardUser),
	);

	//remove
	await sendMessage(
		t.context.bot,
		new Message("alias toberemoved", t.context.standardUser),
	);

	await t.throwsAsync(
		sendMessage(
			t.context.bot,
			new Message("toberemoved", t.context.standardUser),
		),
	);

	const list = await sendMessage(
		t.context.bot,
		new Message("alias", t.context.standardUser),
	);
	t.assert(!list.toString().includes("toberemoved"));
});

// todo: aliases with escaped `;`
// todo: check aliases work
