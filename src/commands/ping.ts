import * as Types from "../types";

export default new (class ping implements Types.Command {
	name = "ping";
	usage = "";
	help = "Display Strawbean's current ping.";
	commandChainingLimit = 0;
	exec = async ({ msg }: Types.CommandContext) => {
		var start = Date.now();
		var sent = await msg.channel.send("Measuring...");
		await sent.edit(
			`Message send took: \`${Date.now() - start}\`ms\n` +
				`Websocket ping: \`${msg.client.ws.ping}\`ms\n` +
				`Time from message timestamp: \`${
					Date.now() - msg.createdTimestamp
				}\`ms`,
		);
	};
})();
