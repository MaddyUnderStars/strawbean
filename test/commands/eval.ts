import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test("cannot use", (t: Context) =>
	t.throwsAsync(sendMessage(t.context.bot, new Message("eval 2 + 2"))));
