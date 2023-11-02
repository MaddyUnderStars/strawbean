import test from "ava";
import * as Discord from "discord.js";
import { EventEmitter } from "events";
import FlakeId from "flakeid";
import Bot from "../../build/bot";
import type * as Types from "../../src/types";
import { Context } from "./setup";

const flake = new FlakeId();

const cache = {
	channels: new Discord.Collection<string, Channel>(),
	guilds: new Discord.Collection<string, Guild>(),
	users: new Discord.Collection<string, User>(),
	client: null as any as Client, // lol
};

export class CacheManager {
	type: string;

	constructor(type: string) {
		this.type = type;
	}

	fetch = async (id: string, options: any) => {
		return cache[this.type].find((x) => x.id === id);
	};
}

export class Client extends EventEmitter {
	user = new User("Strawbean#8899");
	users = new CacheManager("users");
	guilds = new CacheManager("guilds");
	channels = new CacheManager("channels");

	ws = {
		ping: 0,
	};

	application = {
		commands: {
			set: async (options) => {
				// do nothing lol
			},

			create: async (opts) => {
				// lol
			},
		},
	};

	constructor() {
		super();

		cache.client = this;
	}
}

export class User {
	presence: Discord.PresenceData;
	id: string = flake.gen();
	bot: boolean = false;
	__dmChannel = new Channel();
	tag: string;

	constructor(tag: string = "") {
		this.tag = tag;
		cache.users.set(this.id, this);
	}

	setPresence = (data: Discord.PresenceData) => {
		this.presence = data;
		return this.presence;
	};

	createDM = async () => {
		return this.__dmChannel;
	};
}

export class GuildMember {
	permissions = new Discord.Permissions();
	user: User;
	guild: Guild;
	id: string;

	constructor(user = new User(), guild = new Guild()) {
		this.user = user;
		this.id = this.user.id;
		this.guild = guild;
	}
}

export class Guild {
	id = flake.gen();

	constructor() {
		cache.guilds.set(this.id, this);
	}
}

export class Channel extends EventEmitter {
	id = flake.gen();

	guild: Guild;

	constructor(guild = new Guild()) {
		super();
		this.guild = guild;
		cache.channels.set(this.id, this);
	}

	send = async (options: string | Discord.MessageOptions) => {
		const strawbean = new GuildMember(
			cache.users.find((x) => x.tag === "Strawbean#8899"),
			this.guild,
		);
		var msg = new Message("test content", strawbean, this.guild, this);
		this.emit(
			"__testMessageSent",
			typeof options == "string" ? options : { id: msg.id, ...options },
		);
		return msg;
	};
}

export class Message {
	id = flake.gen();
	content: string;
	author: User;
	member: GuildMember;
	channel: Channel;
	guild: Guild;

	client: Client;

	constructor(
		content: string,
		author = new GuildMember(),
		guild = new Guild(),
		channel = new Channel(guild),
	) {
		this.content = content;

		this.member = author;
		this.author = this.member.user;
		this.channel = channel;
		this.guild = this.member.guild;

		this.client = cache.client;
	}

	reply = async (options) => {
		return await this.channel.send(options);
	};

	edit = async (options) => {
		return await this.channel.send(options);
	};
}

export const sendMessage = (
	bot: Bot,
	message: Message,
	withPrefix = true,
): Promise<Discord.MessageOptions & { id?: string }> =>
	new Promise(async (resolve, reject) => {
		message.channel.once("__testMessageSent", resolve);
		if (withPrefix)
			message.content = process.env.DEFAULT_PREFIX + message.content;
		await bot.messageCreate(message as any as Discord.Message);
		setTimeout(() => reject(new Error("no reply")), 1000);
	});

export const testReminder = test.macro(
	async (
		t: Context,
		message: Message,
		expected: Date,
		repeating = false,
		here = false,
	) => {
		while (expected.valueOf() < Date.now() - 60 * 1000) {
			//strawbean should set the reminder date to next day if it's in the past
			expected.setDate(expected.getDate() + 1);
		}

		//timezone stuff
		if (
			t.context.bot.Env.libs.language.isDst(new Date()) &&
			!t.context.bot.Env.libs.language.isDst(expected)
		)
			expected.setHours(expected.getHours() - 1);
		else if (
			!t.context.bot.Env.libs.language.isDst(new Date()) &&
			t.context.bot.Env.libs.language.isDst(expected)
		)
			expected.setHours(expected.getHours() + 1);

		const reply = await sendMessage(t.context.bot, message);
		if (typeof reply == "string" || !reply.embeds)
			return t.fail(
				"message did not contain embed " +
					JSON.stringify(reply) +
					" : " +
					message.content,
			);

		const reminders = (await t.context.bot.Env.libs.reminders.getAll(
			message.author.id,
		)) as Types.Reminder[];

		const id = parseInt(
			reply.embeds[0].title?.split(" ")?.[0]?.split("#")?.[1] || "",
		); // lol
		const reminder = reminders.find((x) => x.remove_id == id - 1);
		t.assert(reminder, `reminder does not exist ${message.content}`);
		t.assert(
			Math.abs(reminder!.time - expected.valueOf()) < 5 * 1000, //5 seconds leeway
			`received ${new Date(
				reminder!.time,
			).toLocaleString()}, expected ${expected.toLocaleString()} : ${
				message.content
			}`,
		);
		t.assert(
			repeating ? reminder!.setTime - reminder!.time : true,
			`does not repeat : ${message.content}`,
		);
		t.assert(here ? reminder!.channel == message.channel.id : true);
	},
);
