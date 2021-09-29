import * as Discord from "discord.js"
import { EventEmitter } from "events";

export class Client extends EventEmitter {
	user = new User("Strawbean#8899");
}

export class User {
	presence = null;
	id = Math.floor(Math.random() * 1000).toString()
	bot = false;

	constructor(tag) {
		this.tag = tag;
	}

	setPresence = (data) => {
		this.presence = data;
		return this.presence;
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
}

export class Channel extends EventEmitter {
	id = Math.floor(Math.random() * 1000).toString()

	send = async (options) => {
		this.emit("__testMessageSent", options);
		return new Message("test content");
	}
}

export class Message {
	id = Math.floor(Math.random() * 1000).toString()
	content;
	author;
	member;
	channel;
	guild;

	constructor(content, author = new GuildMember(), guild = new Guild(), channel = new Channel()) {
		this.content = content;

		this.member = author;
		this.author = this.member.user;
		this.channel = channel;
		this.guild = this.member.guild;
	}

	reply = async (options) => {
		return await this.channel.send(options)
	}
}