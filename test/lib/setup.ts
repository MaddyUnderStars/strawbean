import { ExecutionContext, TestFn } from "ava";
import Discord from "discord.js";
import { MongoMemoryServer } from "mongodb-memory-server";
import Bot from "../../src/bot";
import * as DiscordMock from "./discordmock";

export type Context = ExecutionContext<{
	mongo: MongoMemoryServer;
	client: DiscordMock.Client;
	bot: Bot;
	adminUser: DiscordMock.GuildMember;
	standardUser: DiscordMock.GuildMember;
}>;

export const setupTests = (test: TestFn) => {
	test.serial.beforeEach("setup db", async (t: Context) => {
		t.context.mongo = await MongoMemoryServer.create();

		process.env.MONGO_URL = t.context.mongo.getUri();
		process.env.owner = "226230010132824066";
		process.env.DEFAULT_PREFIX = "%";
		process.env.DEFAULT_LOCALE = "en-AU";
		process.env.DEFAULT_TIMEZONE = "Australia/Sydney";
	});

	test.serial.beforeEach("create bot instance", async (t: Context) => {
		t.context.client = new DiscordMock.Client();
		t.context.bot = new Bot(
			//@ts-ignore FIXME
			t.context.client,
			`strawbean-test-${Math.random().toString(24).slice(2)}`,
		);

		await t.context.bot.ready();

		//we don't want any library intervals to run automatically for tests
		//@ts-ignore
		for (var curr in t.context.bot.intervals) {
			//@ts-ignore
			clearInterval(t.context.bot.intervals[curr]);
			//@ts-ignore
			delete t.context.bot.intervals[curr];
		}

		t.true(t.context.bot.Env.ready);

		t.context.adminUser = new DiscordMock.GuildMember();
		t.context.adminUser.permissions = new Discord.Permissions(
			Discord.Permissions.ALL,
		);

		t.context.standardUser = new DiscordMock.GuildMember();
	});

	test.afterEach.always("clean database", async (t: Context) => {
		const collections = ["reminders", "users", "guilds"];

		for (var collection of collections) {
			//@ts-ignore
			await t.context.bot.mongo
				.db(process.env.DB_NAME)
				.collection(collection)
				.deleteMany({});
		}
	});
};
