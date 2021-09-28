import * as Bot from "./bot.js"	//what the fuck?

import * as Discord from 'discord.js';
const client = new Discord.Client({
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
	intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILD_MESSAGE_REACTIONS"],
});

client.on("ready", Bot.ready)

client.on("error", Bot.error)

client.on("disconnect", Bot.disconnectHandler);
client.on("shardDisconnect", Bot.disconnectHandler);

client.on("messageCreate", Bot.messageCreate)

try {
	Bot.init(client);
	client.login(process.env.TOKEN);
}
catch (e) {
	console.error("Couldn't login, probably offline?")
}