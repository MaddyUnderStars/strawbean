import test from "ava";
import Discord from "discord.js";
import { Message, sendMessage } from "./lib/discordmock";
import { Context, setupTests } from "./lib/setup";

setupTests(test);

test("reminders are sent", (t: Context) =>
	new Promise(async (resolve, reject) => {
		const msg = new Message(`remindme test in 1 second`);
		const reply = await sendMessage(t.context.bot, msg);

		await new Promise((resolve) =>
			setTimeout(() => resolve(undefined), 1000),
		);

		msg.author.__dmChannel.once("__testMessageSent", (reminder) => {
			t.pass();
			resolve();
		});

		await t.context.bot.Env.libs.reminders.interval(
			t.context.bot.Env,
			t.context.bot.client,
		);
	}));

// todo: rewrite this test
test("resend reminder using previous time", (t: Context) =>
	new Promise(async (resolve, reject) => {
		const msg = new Message(`remindme test in 1 second`);
		const reply = await sendMessage(t.context.bot, msg);

		await new Promise((resolve) =>
			setTimeout(() => resolve(undefined), 1000),
		);

		t.plan(2);

		msg.author.__dmChannel.once("__testMessageSent", async (reminder) => {
			await new Promise((resolve) =>
				setTimeout(() => resolve(undefined), 1000),
			);

			const obj = {
				user: msg.author,
				customId: "timeSelect",
				message: {
					id: reminder.id,
				},
				values: ["0"],
				reply: () => {
					t.pass();
				},
			};
			Object.setPrototypeOf(obj, Discord.SelectMenuInteraction.prototype);
			await t.notThrowsAsync(
				t.context.bot.Env.libs.reminders.handleButtons(obj),
			);

			resolve();
		});

		await t.context.bot.Env.libs.reminders.interval(
			t.context.bot.Env,
			t.context.bot.client,
		);
	}));
