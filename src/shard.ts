import * as dotenv from 'dotenv'
if (!process.env.TOKEN) {
	dotenv.config()
}

import Bot from "./bot.js"	//what the fuck?

import * as Discord from 'discord.js';
const client = new Discord.Client({
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
	intents: [
		"GUILDS",
		"GUILD_MESSAGES",
		"DIRECT_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"GUILD_INTEGRATIONS"
	],
});

const bot = new Bot(client, process.env.DB_NAME);

client.on("ready", bot.ready)

client.on("error", bot.error)

client.on("disconnect", bot.disconnectHandler);
client.on("shardDisconnect", bot.disconnectHandler);

client.on("messageCreate", bot.messageCreate)

try {
	client.login(process.env.TOKEN);
}
catch (e) {
	console.error("Couldn't login, probably offline?")
}