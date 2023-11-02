import test from "ava";
import { GuildMember, Message, User, sendMessage } from "./lib/discordmock";
import { Context, setupTests } from "./lib/setup";

setupTests(test);

test("does not reply to other bots", async (t: Context) => {
	const user = new User();
	user.bot = true;
	const msg = new Message("help", new GuildMember(user));
	await t.throwsAsync(sendMessage(t.context.bot, msg));
});
