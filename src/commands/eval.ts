import * as Types from "../types";

export default new (class evalCommand implements Types.Command {
	name = "eval";
	usage = "";
	owner = true;
	help = "";
	exec = async (context: Types.CommandContext) => {
		if (context.user._id !== process.env.OWNER)
			return;

		var stringifyCache = [];
		var stringify = (output) => {
			return JSON.stringify(output, (key, value) => {
				if (typeof value === 'object' && value !== null) {
					// Duplicate reference found, discard key
					if (stringifyCache.includes(value)) return;

					// Store value in our collection
					stringifyCache.push(value);
				}
				return value;
			}, 2);
		};

		try {
			var out: any = eval(context.args.join(" "));

			var send = "```js\n" + stringify(out) + "```";
			if (send.length > 2000) send = send.substr(0, 1960) + "``` ... pruned under 2000 characters";

			return { reply: send };
		}
		catch (e) {
			return { reply: "```js\n" + e.toString() + "```" };
		}
	};
});