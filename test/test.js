import test from "ava"
import { MongoMemoryServer } from 'mongodb-memory-server'

import * as Discord from "discord.js"

import Bot from "./../build/bot.js"
import ts from "typescript";
var bot = null;

import * as MockApi from './mockApi.js'

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const awaitReply = (message, sendPrefix = true) => new Promise(async (resolve, reject) => {
	message.channel.addListener("__testMessageSent", resolve);
	if (sendPrefix) message.content = (bot?.cache?.guilds[message.guild.id]?.prefix ?? "%") + message.content;
	await bot.messageCreate(message)
	setTimeout(() => reject("no reply"), 2000);	//give it a second I guess?
})

const shouldNoReply = async (t, msg, sendPrefix = true, admin = true) => {
	var msg = new MockApi.Message(msg, admin ? t.context.adminUser : t.context.standardUser)
	try {
		var reply = await awaitReply(msg, sendPrefix);
	}
	catch (e) {
		return t.pass();
	}
	t.fail(reply)
}

test.serial.before("start database", async t => {
	t.timeout(60 * 1000, "db takes a while to download");
	t.context.mongo = await MongoMemoryServer.create();
})

test.serial.before("start", async t => {
	process.env.MONGO_URL = t.context.mongo.getUri();
	process.env.DB_NAME = "strawbean-dev";
	process.env.OWNER = "226230010132824066";

	t.context.client = new MockApi.Client();

	bot = new Bot(t.context.client);

	t.context.adminUser = new MockApi.GuildMember();
	t.context.adminUser.permissions = new Discord.Permissions(Discord.Permissions.ALL);

	t.context.standardUser = new MockApi.GuildMember();

	t.context.defaultPrefix = "%"
})

test.serial.before("bot readys", async t => {
	await bot.ready();

	//we don't want any library intervals to run automatically for tests
	for (var curr in bot.intervals) {
		clearInterval(bot.intervals[curr]);
		delete bot.intervals[curr]
	}

	t.true(bot.Env.ready);
})

test.serial.before("do not reply to random admin", shouldNoReply, (Math.random() * 1e10).toString(26), false)
test.serial.before("do not reply to random standard", shouldNoReply, (Math.random() * 1e10).toString(26), false, false)

test.serial.before("test user was added to cache", t => {
	t.assert(Object.keys(bot.cache.users).length > 0);
})

test("ping sends help message", async t => {
	var msg = new MockApi.Message(`<@${t.context.client.user.id}>${" ".repeat(Math.random() * 1000)}`, t.context.adminUser)
	var reply = await awaitReply(msg, false);
	t.assert(reply.indexOf("use `help`") !== -1, "help command is mentioned");
})

test("mobile ping sends help message", async t => {
	var msg = new MockApi.Message(`<@!${t.context.client.user.id}>${" ".repeat(Math.random() * 1000)}`, t.context.adminUser)
	var reply = await awaitReply(msg, false);
	t.assert(reply.indexOf("use `help`") !== -1, "help command is mentioned");
})

test("cannot use eval", shouldNoReply, "eval 1 + 1")
test("cannot use reload", shouldNoReply, "reload remind")

test("//prefix", async t => {
	var msg = new MockApi.Message(`prefix ??`, t.context.adminUser)
	var reply = await awaitReply(msg);
	t.is(reply, `Updated server-wide prefix to \`??\``)
	t.is(bot.cache.guilds[msg.guild.id].prefix, "??")

	var msg = new MockApi.Message(`prefix`, t.context.adminUser)
	var reply = await awaitReply(msg);
	t.is(reply, `Updated server-wide prefix to \`${t.context.defaultPrefix}\``)
	t.is(bot.cache.guilds[msg.guild.id].prefix, t.context.defaultPrefix)
})

test("//mefix", async t => {
	var msg = new MockApi.Message(`mefix`, t.context.standardUser)
	var reply = await awaitReply(msg);
	t.is(reply, `Updated personal prefix to \`${t.context.defaultPrefix}\``)
	t.assert(reply.indexOf(t.context.defaultPrefix) !== -1);
	t.is(bot.cache.users[msg.member.id].prefix, t.context.defaultPrefix)
	t.is(bot.cache.guilds[msg.guild.id].prefix, t.context.defaultPrefix)
})

var testReminderNotification = (t, message, expected, repeating = false, dm = false, user = t.context.adminUser) => new Promise(async (resolve, reject) => {
	var msg = new MockApi.Message(message, user);
	var reply = await awaitReply(msg);

	await wait(1000);	//why do I need to wait?

	(dm ? msg.author.__dmChannel : msg.channel).addListener("__testMessageSent", (r) => {
		t.is(r.content, `<@${msg.author.id}> : \`${expected}\``);
		t.assert(r.embeds);
		t.assert(r.components);
		resolve();
	}, { once: true })

	await bot.Env.libs.reminders.interval(bot.Env, bot.client)
	setTimeout(() => { reject("time out"); }, 1000);
})

test.serial("channel reminders are sent, made by admin", testReminderNotification, "remindme here test in 1 second", "test");
test.serial("channel reminders are sent, made by standard", testReminderNotification, "remindme here test in 1 second", "test", false, false, new MockApi.GuildMember());
test.serial("repeating channel reminders made by standard are sent to dm", testReminderNotification, "remindme here test every 1 second", "test", true, true, new MockApi.GuildMember());
test.serial("dm reminders are sent", testReminderNotification, "remindme test in 1 second", "test", false, true);
test.serial("repeating dm reminders are sent", testReminderNotification, "remindme test every 1 second", "test", true, true);

test.serial("//remove all", async t => {
	var msg = new MockApi.Message(`remindme test in 1 year`, new MockApi.GuildMember())
	var reply = await awaitReply(msg);

	var msg = new MockApi.Message(`remove all`, t.context.adminUser)
	var reply = await awaitReply(msg);
	t.assert(reply.embeds[0].title.indexOf("Removed 1") === -1)

	var reminders = await bot.Env.libs.reminders.getAll(msg.author.id);
	t.falsy(reminders.length)
})

const testReminders = async (t, message, expected, repeating = null) => {
	var msg = new MockApi.Message(message, t.context.adminUser)

	var reply = await awaitReply(msg);

	if (!reply.embeds) return resolve(t.fail(`message did not contain embed. message: ${reply}`));

	var reminders = await bot.Env.libs.reminders.getAll(msg.author.id);
	var Id = parseInt(reply.embeds[0].title.split(" ")[0].split("#")[1])	//lol
	var reminder = reminders.find(x => x.remove_id === Id - 1);
	t.assert(reminder, "reminder does not exist");
	t.assert(reminder.time - expected < 5 * 1000,	//5 seconds allowed difference
		`received ${new Date(reminder.time).toLocaleString()} expected ${new Date(expected).toLocaleString()}`);
	t.assert(repeating ? reminder.repeating : !reminder.repeating);
}

test("remindme this is a long string with the word in in its name in 1 hour",
	t => testReminders(t, t.title, (new Date()).setHours((new Date()).getHours() + 1)));

test("remindme test in 1 hour", t => testReminders(t, t.title, (new Date()).setHours((new Date()).getHours() + 1)));
test("remindme test in 1 day", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 1)));
test("remindme test tomorrow", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 1)));
test("remindme test in 1 week", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 7)));
test.failing("remindme test in 1 month", t => testReminders(t, t.title, (new Date()).setMonth((new Date()).getMonth() + 1)));
test.failing("remindme test in 1 year", t => testReminders(t, t.title, (new Date()).setFullYear((new Date()).getFullYear() + 1)));

test("remindme test every 1 hour", t => testReminders(t, t.title, (new Date()).setHours((new Date()).getHours() + 1), true));
test("remindme test every 1 day", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 1), true));
test("remindme test every 1 week", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 7), true));
test.failing("remindme test every 1 month", t => testReminders(t, t.title, (new Date()).setMonth((new Date()).getMonth() + 1), true));
test.failing("remindme test every 1 year", t => testReminders(t, t.title, (new Date()).setFullYear((new Date()).getFullYear() + 1), true));

test("remindme test week", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 7)));
test("remindme test weekly", t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 7), true));
test(`remindme test at ${new Date().toLocaleDateString()} in 1 week`, t => testReminders(t, t.title, (new Date()).setDate((new Date()).getDate() + 7)));
test(`remindme test at ${new Date().toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: '2-digit', minute: '2-digit' })}`, t =>
	testReminders(t, t.title, new Date().setSeconds(0)));

test(`remindme test at ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", hour: '2-digit', minute: '2-digit' }).split(",").join("")} in 1 week`, t => testReminders(t, t.title,
	new Date((new Date()).setDate((new Date()).getDate() + 7)).setSeconds(0)));	//well it works I guess

test("remove bad id", async t => {
	var msg = new MockApi.Message("remove 9999", t.context.adminUser);
	var reply = await awaitReply(msg);
	t.is(reply.embeds[0].title, "Deleted 0 reminders")
})

test.serial("rename 1 example reminder", async t => {
	var msg = new MockApi.Message("remindme test in second", t.context.adminUser);
	var reply = await awaitReply(msg);

	var reminders = await bot.Env.libs.reminders.getAll(msg.author.id);
	var Id = parseInt(reply.embeds[0].title.split(" ")[0].split("#")[1]) - 1
	var reminder = reminders.find(x => x.remove_id === Id);

	var msg = new MockApi.Message(`rename ${Id + 1} example reminder`, t.context.adminUser);
	var reply = await awaitReply(msg);

	var reminders = await bot.Env.libs.reminders.getAll(msg.author.id);
	var reminder = reminders.find(x => x.remove_id === Id);

	t.is(reminder.name, "example reminder")
})

test("rename bad id", async t => {
	var msg = new MockApi.Message("rename 9999 example reminder", t.context.adminUser);
	var reply = await awaitReply(msg);
	t.falsy(reply.embeds)
})

test("rename bad name", async t => {
	var msg = new MockApi.Message("rename", t.context.adminUser);
	var reply = await awaitReply(msg);
	t.falsy(reply.embeds)
})

test.after("stop server", async t => {
	await wait(1000);
	await t.context.mongo.stop();
})