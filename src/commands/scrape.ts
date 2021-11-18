import * as Types from "../types"

export default new (class scrape implements Types.Command {
	name = "scrape";
	usage = "[url]";
	help = "Notifies you of updates to websites. No arguments lists your current observers";
	exec = async ({ args, Libs, user }: Types.CommandContext) => {
		if (args[0] === "rm") {
			var string = args.slice(1).join(" ");
			if (!string.startsWith("http://") && !string.startsWith("https://"))
				string = "https://" + string;
			try {
				var url = new URL(string);
			}
			catch (e) {
				return { reply: "Invalid URL!" };
			}

			await Libs.scrape.remove(url.toString(), user._id);

			return { reply: `Removed URL ${url.toString()}`}
		}

		if (args.length) {
			var string = args.join(" ");
			if (!string.startsWith("http://") && !string.startsWith("https://"))
				string = "https://" + string;
			try {
				var url = new URL(string);
			}
			catch (e) {
				return { reply: "Invalid URL!" };
			}

			await Libs.scrape.add({ url: url.toString(), owners: [user._id], name: url.hostname })

			return { reply: `Added URL observer for ${url.toString()}. Your first notification may be a false positive.` };
		}

		const list = await Libs.scrape.getAll(user._id);
		if (!list.length) return { reply: "You are not observing any URLs. Use `scrape [url]` to add one." };

		return { reply: `Observer list:\n\n${list.map(x => x.url).join("\n")}` }
	}
})