import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("home", async (t: Context) => {
	const ret = await sendMessage(t.context.bot, new Message("help"));
	delete ret.id;
	t.snapshot(ret);
});

// todo: command help
// todo: extra feature help
