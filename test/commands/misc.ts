import test from "ava";
import { Message, sendMessage } from "../lib/discordmock";
import { Context, setupTests } from "../lib/setup";

setupTests(test);

test(";;;;;;;;;;;;;;;;;;;", async (t: Context) => {
	try {
		await sendMessage(t.context.bot, new Message(";;;;;;;;;;;;;;;;;;;"));
	} catch (e) {
		return t.pass();
	}
	t.fail();
});

test("cannot chain help, list", async (t: Context) => {
	const reply = await sendMessage(
		t.context.bot,
		new Message("help; list; help; list; help; list;"),
	);
	t.is(typeof reply != "string" && reply?.embeds?.length, 2);
});
