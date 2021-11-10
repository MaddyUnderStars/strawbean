import * as Discord from 'discord.js';
import * as fs from 'fs/promises'
import { MongoClient } from 'mongodb';

import * as Types from './types'

export default class Bot {
	private mongo: MongoClient = null;
	private client: Discord.Client = null;
	private intervals: { [key: string]: NodeJS.Timeout } = {};
	cache: {
		users: { [key: string]: Types.User },
		guilds: { [key: string]: Types.Guild }
	} = { users: {}, guilds: {} };
	Env: Types.Environment = {
		ready: false,
		mongo: this.mongo,
		defaultAliases: {
			remindme: "remind",
			r: "remind",
			lr: "listReminds",
			rm: "remove",
			del: "remove",
			delete: "remove",
			clear: "remove",
			tz: "timezone",
			e: "expand"
		},
	}

	constructor(client: Discord.Client) {
		this.client = client;
		this.mongo = new MongoClient(process.env.MONGO_URL || "localhost");
	}

	ready = async () => {
		await this.connectMongo();

		this.Env.libs = await this.parseDirectory("libraries");
		for (let name in this.Env.libs) {
			const curr = this.Env.libs[name];
			if (curr.exec) await curr.exec(this.Env, this.client);

			if (curr.interval) {
				var handleInterval = async () => {
					try {
						var ret = await curr.interval(this.Env, this.client);
						if (ret === -1) return;
					}
					catch (e) {
						console.error(`${curr.name} interval failed\n${e}`);
						await this.dmOwner(`${curr.name} interval failed\n\`${e}\``);
					}
					this.intervals[curr.name] = setTimeout(handleInterval, curr.timeout || 10 * 1000);
				}
				handleInterval();
			}
		}

		this.Env.commands = await this.parseDirectory('commands');

		await this.client.user.setPresence({
			activities: [{
				name: "donate to Wikipedia",
				type: "PLAYING",
			}]
		});

		this.Env.ready = true;

		console.log(`Logged in as ${this.client.user.tag}`);
	}

	error = (e: Error) => console.error(e);

	disconnectHandler = (e: Error | Discord.CloseEvent) => console.log(`client disconnected ${e}`);

	messageCreate = async (msg: Discord.Message): Promise<any> => {
		if (msg.partial) return;
		if (!this.Env.ready) return;
		if (msg.author.bot) return;

		var guild: Types.Guild = null;
		if (msg.guild) guild = await this.getCache(msg.guild.id, "guilds", {
			_id: msg.guild.id,
			prefix: process.env.DEFAULT_PREFIX,
		}) as Types.Guild;

		var user = await this.getCache(msg.author.id, "users", {
			_id: msg.author.id,
			username: msg.author.username,
			prefix: process.env.DEFAULT_PREFIX,
			alias: {},
			timezone: "Australia/Sydney",
			locale: "en-AU",
		}) as Types.User;

		var pingString = `<@!${this.client.user.id}>`;	//stupid solution

		//Why? Because mobile pings are different than desktop pings, for some reason.
		//Checking for both would be too annoying, so instead we do this.
		//God.
		msg.content = msg.content.replace(`<@${this.client.user.id}>`, pingString);

		if (msg.content.indexOf(pingString) === 0 && msg.content.trim().length === pingString.length)
			return msg.reply(`Hey, for a list of commands and their usage, use \`help\`.\n\n` +
				`Your personal prefix is \`${user.prefix}\`.\n` +
				(guild ? `This guilds prefix is \`${guild.prefix}\`\n` : "") +
				`\nAlternatively, you can use my ping as a prefix. \`@Strawbean remindme test in 1 second\``
			);

		var argsStartPos: number = 0;
		var content = msg.content;

		if (content.indexOf(pingString) === 0 && content.trim().length > pingString.length)
			argsStartPos = pingString.length + 1;	//was the ping used instead of prefix?
		else if (content.indexOf(user.prefix) === 0)
			argsStartPos = user.prefix.length;		//was user prefix used?
		else if (msg.guild && content.indexOf(guild.prefix) === 0)
			argsStartPos = guild.prefix.length;		//guild prefix
		else if (!msg.guild)
			argsStartPos = 0;	//are we in dm?
		else
			return;		//no valid prefix found

		//kinda bad solution but whatever, it'll work.
		var replies: Array<{ returnValue: Types.CommandReturnValue, command: string }> = [];

		var commands = content.substring(argsStartPos).split(";").filter(x => !!x);	//remove empty commands
		for (var curr of commands) {
			if (!curr) continue;
			if (replies.length === 5 && commands.length > 6) {
				replies.push({ returnValue: { reply: "You cannot chain more than 5 commands."}, command: "curr" });
				break;
			}

			var args = curr.trim().split(" ");

			var alias = user.alias[args[0].toLowerCase()] ?? this.Env.defaultAliases[args[0].toLowerCase()];
			if (alias) args.splice(0, 1, ...alias.split(" "));

			var cmd = args.shift().toLowerCase();

			var toRun = this.Env.commands[cmd];
			if (!toRun) return;
			if ('commandChainingLimit' in toRun && replies.filter(x => x.command === cmd).length > toRun.commandChainingLimit)
				continue;

			if (toRun.owner && msg.author.id !== process.env.OWNER) return;

			try {
				var ret = await toRun.exec({
					msg: msg,
					args: args,
					guild: guild || null,
					user: user,
					Env: this.Env,
					Libs: this.Env.libs,
				});

				if (!ret) continue;
				if (ret?.reply) replies.push({ command: cmd, returnValue: ret });
			}
			catch (e) {
				await msg.react("💢");
				console.error(e);
				await this.dmOwner(`Error thrown by message: \`${msg.content}\` by user \`${msg.author.id}\` ( \`${msg.author.username}\` )\`\`\`${e}\`\`\``);
				if (commands.length > 1)
					replies.push({
						command: cmd,
						returnValue: {
							reply: `There was an error processing \`${curr}\`. Command execution was stopped.`
						}
					});
				break;
			}
		}

		if (replies.length < 2) {
			if (replies[0]?.returnValue?.reply) await msg.reply(replies[0].returnValue.reply)
			return;
		}

		for (var i = 0; i < replies.length; i++) {
			var reply = replies[i].returnValue.reply;	//nice
			if (typeof reply === "string") {
				replies[i].returnValue = {
					reply: {
						embeds: [{
							title: replies[i].command,
							description: reply,
						}]
					}
				}
			}
		}

		await msg.reply({ embeds: replies.map(x => (x.returnValue.reply as Discord.ReplyMessageOptions).embeds[0]) })
	}

	private connectMongo = async () => {
		try {
			await this.mongo.connect();
			this.Env.db = this.mongo.db(process.env.DB_NAME);
			console.log(`Connected to mongo on db ${process.env.DB_NAME}`);
		}
		catch (e) {
			console.error("failed mongo connect");
			await this.dmOwner(`mongo connect failed\n\`${e}\``)
			process.exit();
		}
	}

	private parseDirectory = async (path: string): Promise<{ [key: string]: any }> => {
		var files = await fs.readdir(`./build/${path}`);
		var ret = {};
		for (let curr of files) {
			if (curr.indexOf(".js.map") !== -1) continue;	//debug files
			try {
				var file = await import(`./${path}/${curr}`)
			}
			catch (e) {
				console.log(`Failed to import file ./${path}/${curr} : ${e}`)
			}

			if (!file.default) continue;
			ret[file.default.name.toLowerCase()] = file.default;
		}
		return ret
	}

	private getCache = async (id: string,
		col: "users" | "guilds",
		fallback: Types.User | Types.Guild)
		: Promise<Types.User | Types.Guild> => {

		var ret = this.cache[col][id];
		if (ret) return ret;

		var collection = this.Env.db.collection(col);
		ret = await collection.findOne({ _id: id }) as (Types.User | Types.Guild);	//hm?
		if (ret) return Object.assign(fallback, this.cache[col][id] = ret);

		await collection.insertOne(fallback as Object);
		return this.cache[col][id] = fallback;
	}

	private dmOwner = async (msg: string | Discord.MessagePayload): Promise<Discord.Message> => {
		try {
			var user = await this.client.users.fetch(process.env.OWNER);
			var channel = await user.createDM();
			return await channel.send(msg);
		}
		catch (e) {
			console.error(`I couldn't send a dm to my owner (${process.env.OWNER}). I'm probably offline;\nDm contents : ${JSON.stringify(msg)}`);
		}
	}
}