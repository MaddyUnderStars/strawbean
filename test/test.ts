import anyTest, { TestInterface, Macro, ExecutionContext } from "ava";
import { MongoMemoryServer } from "mongodb-memory-server";

import Bot from "../build/bot.js";
import * as Types from '../src/types.js';
import * as Discord from "discord.js";
import * as MockApi from "./mockApi.js";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const awaitReply = (bot: Bot, message: MockApi.Message, sendPrefix = true): Promise<Discord.Message> => new Promise(async (resolve, reject) => {
	message.channel.once("__testMessageSent", resolve);
	if (sendPrefix) message.content = process.env.DEFAULT_PREFIX + message.content;
	await bot.messageCreate(message);
	setTimeout(() => reject("no reply"), 1000);
});

const test = anyTest as TestInterface<{
	mongo: MongoMemoryServer,
	client: MockApi.Client,
	bot: Bot,
	adminUser: MockApi.GuildMember,
	standardUser: MockApi.GuildMember,
}>;

type macroContext = ExecutionContext<{
	mongo: MongoMemoryServer,
	client: MockApi.Client,
	bot: Bot,
	adminUser: MockApi.GuildMember,
	standardUser: MockApi.GuildMember,
}>;

test.serial.before("start database", async t => {
	t.context.mongo = await MongoMemoryServer.create();

	process.env.MONGO_URL = t.context.mongo.getUri();
	process.env.owner = "226230010132824066";
	process.env.DEFAULT_PREFIX = "%";
	process.env.DEFAULT_LOCALE = "en-AU";
	process.env.DEFAULT_TIMEZONE = "Australia/Sydney";
});

test.beforeEach("create new bot instance", async t => {
	t.context.client = new MockApi.Client();
	t.context.bot = new Bot(t.context.client, `strawbean-test-${Math.random().toString(24).slice(2)}`);

	await t.context.bot.ready();

	//we don't want any library intervals to run automatically for tests
	for (var curr in t.context.bot.intervals) {
		clearInterval(t.context.bot.intervals[curr]);
		delete t.context.bot.intervals[curr];
	}

	t.true(t.context.bot.Env.ready);

	t.context.adminUser = new MockApi.GuildMember();
	t.context.adminUser.permissions = new Discord.Permissions(Discord.Permissions.ALL);

	t.context.standardUser = new MockApi.GuildMember();
});

test.afterEach.always("clean database", async t => {
	const collections = [
		"reminders",
		"users",
		"guilds",
	];

	for (var collection of collections) {
		await t.context.bot.mongo.db(process.env.DB_NAME).collection(collection).deleteMany({});
	}
});

const testReminder: Macro<[MockApi.Message, Date, boolean]> = async (t: macroContext, message, expected, repeating = false) => {
	while (expected.valueOf() < Date.now() - 60 * 1000) {
		//strawbean should set the reminder date to next day if it's in the past
		expected.setDate(expected.getDate() + 1);
	}

	//timezone stuff
	if (t.context.bot.Env.libs.language.isDst(new Date()) &&
		!t.context.bot.Env.libs.language.isDst(expected))
		expected.setHours(expected.getHours() - 1);
	else if (!t.context.bot.Env.libs.language.isDst(new Date()) &&
		t.context.bot.Env.libs.language.isDst(expected))
		expected.setHours(expected.getHours() + 1);

	const reply = await awaitReply(t.context.bot, message, true);
	if (!reply.embeds) return t.fail(`message did not contain embed : ${reply}`);

	const reminders = await t.context.bot.Env.libs.reminders.getAll(message.author.id) as Types.Reminder[];
	const Id = parseInt(reply.embeds[0].title.split(" ")[0].split("#")[1]);	//lol
	const reminder = reminders.find(x => x.remove_id === Id - 1);
	t.assert(reminder, `reminder does not exist : ${message.content}`);
	t.assert(Math.abs(reminder.time - expected.valueOf()) < 5 * 1000, 	//5 seconds leeway
		`received ${new Date(reminder.time).toLocaleString()}, expected ${expected.toLocaleString()} : ${message.content}`);
	t.assert(repeating ? reminder.setTime - reminder.time : true, `does not repeat : ${message.content}`);
};

test("remindme test in [time]", async t => {
	const units = {
		year: 365.25 * 24 * 60 * 60 * 1000,
		month: (365.25 / 12) * 24 * 60 * 60 * 1000,
		week: 7 * 24 * 60 * 60 * 1000,
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
	};

	for (var unit in units) {
		for (var i = 1; i <= 12; i++) {
			const expected = new Date(Date.now() + i * units[unit]);

			const msg = new MockApi.Message(`remindme test in ${i} ${unit}`);
			await testReminder(t, msg, expected, false);
		}
	}
});

test("remindme test at [date]", async t => {
	var now = new Date();
	for (var year = now.getFullYear(); year < now.getFullYear() + 1; year++) {
		for (var month = 0; month < 12; month++) {
			const thisMonth = new Date(year, month + 1, -1);
			for (var day = 1; day <= thisMonth.getDate(); day++) {
				const expected = new Date(year, month, day, new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

				const msg = new MockApi.Message(`remindme test at ${day}/${month + 1}/${year}`);
				await testReminder(t, msg, expected, false);
			}
		}
	}
});

test("remindme test at [date] [time]", async t => {
	var now = new Date();
	for (var month = now.getMonth(); month < now.getMonth() + 1; month++) {
		const thisMonth = new Date(now.getFullYear(), month + 1, -1);
		for (var day = 1; day <= thisMonth.getDate(); day++) {

			for (var hour = 0; hour < 24; hour++) {
				const expected = new Date(now.getFullYear(), month, day, hour, 0, 0);

				const inputString = expected.toLocaleString(
					process.env.DEFAULT_LOCALE,
					{
						timeZone: process.env.DEFAULT_TIMEZONE,
						dateStyle: "short",
						timeStyle: "short"
					}
				).split(",").join("");
				const msg = new MockApi.Message(`remindme test at ${inputString}`);
				await testReminder(t, msg, expected, false);
			}
		}
	}
});

test("remindme test at [date] [time] in [time]", async t => {
	const units = {
		year: 365.25 * 24 * 60 * 60 * 1000,
		month: (365.25 / 12) * 24 * 60 * 60 * 1000,
		week: 7 * 24 * 60 * 60 * 1000,
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
	};

	var now = new Date();
	for (var unit in units) {
		for (var i = 1; i <= 12; i++) {
			for (var month = now.getMonth(); month < now.getMonth() + 1; month++) {
				const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0);

				const inputString = expected.toLocaleString(
					process.env.DEFAULT_LOCALE,
					{
						timeZone: process.env.DEFAULT_TIMEZONE,
						dateStyle: "short",
						timeStyle: "short"
					}
				).split(",").join("");
				const msg = new MockApi.Message(`remindme test at ${inputString} in ${i} ${unit}`);
				await testReminder(t, msg, new Date(expected.valueOf() + i * units[unit]), false);
			}
		}
	}
});

test("remindme test at [time] [date]", async t => {
	const expected = new Date();
	expected.setSeconds(0);

	const timeString = expected.toLocaleTimeString(process.env.DEFAULT_LOCALE, { timeZone: process.env.DEFAULT_TIMEZONE, timeStyle: "short" });
	const dateString = expected.toLocaleDateString(process.env.DEFAULT_LOCALE, { timeZone: process.env.DEFAULT_TIMEZONE, dateStyle: "short" });
	const msg = new MockApi.Message(`remindme test at ${timeString} ${dateString}`);
	await testReminder(t, msg, expected, false);
});

test("remindme test [unit]", async t => {
	const units = {
		tomorrow: 24 * 60 * 60 * 1000,
		hourly: 60 * 60 * 1000,
		daily: 24 * 60 * 60 * 1000,
		weekly: 7 * 24 * 60 * 60 * 1000,
		fortnightly: 2 * 7 * 24 * 60 * 60 * 1000,
		monthly: 30 * 24 * 60 * 60 * 1000,
		yearly: 365 * 24 * 60 * 60 * 1000,
	};

	for (var unit in units) {
		const expected = new Date(Date.now() + units[unit]);
		const msg = new MockApi.Message(`remindme test ${unit}`);
		await testReminder(t, msg, expected, unit === "tomorrow" ? false : true);
	}
});

test("remindme test at [weekday]", async t => {
	const days = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];

	const nextWeekday = (day, now = new Date()) => {
		now.setDate(now.getDate() + (day + (7 - now.getDay())) % 7);
		return now;
	};

	for (var i = 0; i < days.length; i++) {
		const expected = nextWeekday(i);
		const msg = new MockApi.Message(`remindme test at ${days[i]}`);
		await testReminder(t, msg, expected, false);
	}
});

test("remove all", async t => {
	const user = new MockApi.GuildMember();
	for (var i = 0; i < 10; i++) {
		await awaitReply(t.context.bot, new MockApi.Message("remindme test in 1 year", user));
	}

	const msg = new MockApi.Message("remove all", user);
	const reply = await awaitReply(t.context.bot, msg);

	await wait(1000);

	const reminders = await t.context.bot.Env.libs.reminders.getAll(msg.author.id);
	if (reminders.length) debugger;
	t.falsy(reminders.length, "not all reminders were deleted");
});

test("rename latest example reminder", async t => {
	const user = new MockApi.GuildMember();
	for (var i = 0; i < 10; i++) {
		await awaitReply(t.context.bot, new MockApi.Message("remindme test in 1 year", user));
		await wait(100);
		await awaitReply(t.context.bot, new MockApi.Message("rename latest example reminder", user));
		await wait(100);
	}

	await wait(1000);

	const reminders = await t.context.bot.Env.libs.reminders.getAll(user.id);
	for (var reminder of reminders) {
		t.is(reminder.name, "example reminder", "reminder was not renamed");
	}
});

test("rename 1 example reminder", async t => {
	const user = new MockApi.GuildMember();
	await awaitReply(t.context.bot, new MockApi.Message("remindme test in 1 year", user));
	await awaitReply(t.context.bot, new MockApi.Message("rename 1 example reminder", user));
	const reminders = await t.context.bot.Env.libs.reminders.getAll(user.id);
	t.is(reminders[0].name, "example reminder", "reminder was not renamed");
});

test(";;;;;;;;;;;;;;;;;;;", async t => {
	try {
		await awaitReply(t.context.bot, new MockApi.Message(";;;;;;;;;;;;;;;;;;;"));
	}
	catch (e) {
		return t.pass();
	}
	t.fail();
});

test("cannot chain help, list", async t => {
	const reply = await awaitReply(
		t.context.bot,
		new MockApi.Message("help; list; help; list; help; list;")
	);
	t.is(reply.embeds.length, 2);
});

test("time latest in 1 week", async t => {
	const user = new MockApi.GuildMember();
	await awaitReply(t.context.bot, new MockApi.Message("remindme test in 5 years", user));

	await testReminder(
		t,
		new MockApi.Message("time latest in 1 week", user),
		new Date(new Date().setDate(new Date().getDate() + 7)),
		false,
	);
});

test.after("stop server", async t => {
	await wait(1000);
	await t.context.mongo.stop();
});