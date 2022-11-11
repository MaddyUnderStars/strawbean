import * as Discord from "discord.js";
import { EventEmitter } from "events";
import FlakeId from 'flakeid';

const flake = new FlakeId();

const cache = {
	channels: new Discord.Collection<string, Channel>(),
	guilds: new Discord.Collection<string, Guild>(),
	users: new Discord.Collection<string, User>(),
	client: null as any as Client,	// lol
};

export class CacheManager {
	type: string;

	constructor(type: string) {
		this.type = type;
	}

	fetch = async (id: string, options: any) => {
		return cache[this.type].find(x => x.id === id);
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
			}
		}
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

	send = async (options: string | Discord.MessagePayload | Discord.InteractionReplyOptions) => {
		this.emit("__testMessageSent", options);
		const strawbean = new GuildMember(cache.users.find(x => x.tag === "Strawbean#8899"), this.guild);
		return new Message("test content", strawbean, this.guild, this);
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

	constructor(content: string, author = new GuildMember(), guild = new Guild(), channel = new Channel(guild)) {
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