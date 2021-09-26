// if (!process.env.TOKEN) require("dotenv").config();

import * as Discord from 'discord.js';
const client = new Discord.Client({
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
	intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
});

import * as Types from './types'

import { MongoClient } from 'mongodb';
const mongo = new MongoClient(process.env.MONGO_URL || "localhost");

const connectMongo = async () => {
	try {
		await mongo.connect();
		Env.db = mongo.db(process.env.DB_NAME);
		console.log(`Connected to mongo on db ${process.env.DB_NAME}`);
	}
	catch (e) {
		console.error("failed mongo connect");
		await dmOwner(`mongo connect failed\n\`${e}\``)
		process.exit();
	}
}

import * as fs from 'fs/promises'
const parseDirectory = async (path: string): Promise<{ [key: string]: any }> => {
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

		ret[file.default.name.toLowerCase()] = file.default;
	}
	return ret
}

const cache: {
	users: { [key: string]: Types.User },
	guilds: { [key: string]: Types.Guild }
} = { users: {}, guilds: {} }

const getCache = async (
	id: string,
	col: "users" | "guilds",
	fallback: Types.User | Types.Guild)
	: Promise<Types.User | Types.Guild> => {

	var ret = cache[col][id];
	if (ret) return ret;

	var collection = Env.db.collection(col);
	ret = await collection.findOne({ _id: id }) as (Types.User | Types.Guild);	//hm?
	if (ret) return cache[col][id] = ret;

	await collection.insertOne(fallback as Object);
	return cache[col][id] = fallback;
}

const Env: Types.Environment = {
	ready: false,
	mongo: mongo,
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

const dmOwner = async (msg: string | Discord.MessagePayload): Promise<Discord.Message> => {
	try {
		var user = await client.users.fetch(process.env.OWNER);
		var channel = await user.createDM();
		return await channel.send(msg);
	}
	catch (e) {
		console.error(`I couldn't send a dm to my owner (${process.env.OWNER}). I'm probably offline;\nDm contents : ${JSON.stringify(msg)}`);
	}
}

client.on("ready", async () => {
	await connectMongo();

	Env.libs = await parseDirectory("libraries");
	for (let name in Env.libs) {
		var curr = Env.libs[name];
		if (curr.exec) await curr.exec(Env, client);

		if (curr.interval) {
			var handleInterval = async () => {
				try {
					var ret = await curr.interval(Env, client);
					if (ret === -1) return;
				}
				catch (e) {
					console.error(`${curr.name} interval failed\n${e}`);
					await dmOwner(`${curr.name} interval failed\n\`${e}\``);
				}
				setTimeout(handleInterval, curr.timeout || 10 * 1000);
			}
			handleInterval();
		}
	}

	Env.commands = await parseDirectory('commands');

	await client.user.setPresence({
		activities: [{
			name: "donate to Wikipedia.",
			type: "PLAYING",
		}]
	});

	Env.ready = true;

	console.log(`Logged in as ${client.user.tag}`);
})

client.on("error", (e) => {
	console.error(e);
})

const disconnectHandler = (e) => console.log(`client disconnected ${e}`);
client.on("disconnect", disconnectHandler);
client.on("shardDisconnect", disconnectHandler);

client.on("messageCreate", async (msg): Promise<any> => {
	if (msg.partial) return;
	if (!Env.ready) return;
	if (msg.author.bot) return;

	var guild: Types.Guild = null;
	if (msg.guild) guild = await getCache(msg.guild.id, "guilds", {
		_id: msg.guild.id,
		prefix: "%",
	}) as Types.Guild;

	var user = await getCache(msg.author.id, "users", {
		_id: msg.author.id,
		username: msg.author.username,
		prefix: "%",
		alias: {},
		timezone: "Australia/Sydney",
		locale: "en-AU",
	}) as Types.User;

	var pingString = `<@!${client.user.id}>`;	//stupid solution

	//Why? Because mobile pings are different than desktop pings, for some reason.
	//Checking for both would be too annoying, so instead we do this.
	//God.
	msg.content = msg.content.replace(`<@${client.user.id}>`, pingString);

	if (msg.content.indexOf(pingString) === 0 && msg.content.trim().length === pingString.length)
		return msg.reply(`Hey, for a list of commands and their usage, use \`help\`.\n\n` +
			`Your personal prefix is \`${user.prefix}\`.\n` +
			(guild ? `This guilds prefix is \`${guild.prefix}\`\n` : "")
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

	var args = content.substring(argsStartPos).split(" ");

	var alias = user.alias[args[0].toLowerCase()] ?? Env.defaultAliases[args[0].toLowerCase()];
	if (alias) args.splice(0, 1, ...alias.split(" "));

	var cmd = args.shift().toLowerCase();

	var toRun = Env.commands[cmd];
	if (!toRun) return;

	if (toRun.owner && msg.author.id !== process.env.OWNER) return;

	try {
		var ret = await toRun.exec({
			msg: msg,
			args: args,
			guild: guild || null,
			user: user,
			Env: Env,
			Libs: Env.libs,
		}) as { reply?: string | Discord.MessagePayload | Discord.ReplyMessageOptions };

		if (ret?.reply) msg.reply(ret.reply);
	}
	catch (e) {
		console.error(e);
		await dmOwner(`Error thrown by message: \`${msg.content}\` by user \`${msg.author.id}\` ( \`${msg.author.username}\` )\`\`\`${e}\`\`\``)
	}
})

try {
	client.login(process.env.TOKEN);
}
catch (e) {
	console.error("Couldn't login, probably offline?")
}