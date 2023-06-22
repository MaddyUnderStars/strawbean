import * as dotenv from "dotenv";
dotenv.config();

import { ShardingManager } from "discord.js";
const manager = new ShardingManager("./build/shard.js", {
	token: process.env.TOKEN,
	totalShards: "auto",
	respawn: true,
});

manager.on("shardCreate", (shard) => {
	console.log(`Launched shard ${shard.id}`);

	shard.on("death", () => {
		console.log(`Shard ${shard.id} died.`);
	});
});
manager.spawn().catch((e) => console.error(e));
