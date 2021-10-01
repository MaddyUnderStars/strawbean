import * as Discord from "discord.js"
import { EventEmitter } from "events";

const cache = {
	channels: new Discord.Collection(),
	guilds: new Discord.Collection(),
	users: new Discord.Collection(),
	client: null,
}

export class CacheManager {
	constructor(type) {
		this.type = type;
	}

	fetch = async (id, options) => {
		return cache[this.type].find(x => x.id === id);
	}
}

export class Client extends EventEmitter {
	user = new User("Strawbean#8899");
	users = new CacheManager("users")
	guilds = new CacheManager("guilds")
	channels = new CacheManager("channels")

	ws = {
		ping: 0,
	}

	application = {
		commands: {
			set: async (options) => {
				// do nothing lol
			}
		}
	}

	constructor() {
		super();

		cache.client = this;
	}
}

export class User {
	presence = null;
	id = Math.floor(Math.random() * 1000).toString()
	bot = false;
	__dmChannel = new Channel();

	constructor(tag) {
		this.tag = tag;
		cache.users.set(this.id, this)
	}

	setPresence = (data) => {
		this.presence = data;
		return this.presence;
	}

	createDM = async () => {
		return this.__dmChannel;
	}
}

export class GuildMember {
	permissions = new Discord.Permissions();
	user = null;
	guild = null;
	id = null;

	constructor(user = new User(), guild = new Guild()) {
		this.user = user;
		this.id = this.user.id;
		this.guild = guild;
	}
}

export class Guild {
	id = Math.floor(Math.random() * 1000).toString()

	constructor() {
		cache.guilds.set(this.id, this)
	}
}

export class Channel extends EventEmitter {
	id = Math.floor(Math.random() * 1000).toString()

	guild;

	constructor(guild = new Guild()) {
		super();
		this.guild = guild;
		cache.channels.set(this.id, this)
	}

	send = async (options) => {
		this.emit("__testMessageSent", options);
		return new Message("test content", cache.users.find(x => x.tag === "Strawbean#8899"), this.guild, this);
	}
}

export class Message {
	id = Math.floor(Math.random() * 1000).toString()
	content;
	author;
	member;
	channel;
	guild;

	client;

	constructor(content, author = new GuildMember(), guild = new Guild(), channel = new Channel(guild)) {
		this.content = content;

		this.member = author;
		this.author = this.member.user;
		this.channel = channel;
		this.guild = this.member.guild;

		this.client = cache.client;
	}

	reply = async (options) => {
		return await this.channel.send(options)
	}

	edit = async (options) => {
		return await this.channel.send(options);
	}
}