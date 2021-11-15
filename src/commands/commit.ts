import * as Types from "../types"

import { execSync } from 'child_process'

var cache: string = null;

export default new (class timezone implements Types.Command {
	name = "commit";
	usage = "";
	commandChainingLimit = 0;
	help = "Display version information for Strawbean.";

	primeFactors = (n) => {
		const factors = [];
		let divisor = 2;

		while (n >= 2) {
			if (n % divisor == 0) {
				factors.push(divisor);
				n = n / divisor;
			} else {
				divisor++;
			}
		}
		return factors;
	}

	getCommit = () => {
		try {
			return execSync("git rev-parse HEAD").toString().trim().slice(0, 7);
		}
		catch (e) {
			var string = process.env.HEROKU_SLUG_COMMIT.slice(0, 7) + " : " + process.env.HEROKU_RELEASE_VERSION;
			return string === " : " ? "" : string;
		}
	}
	exec = async (Context: Types.CommandContext) => {
		const commit = cache || this.getCommit();
		var lol = commit.split(":")[0];
		var output = `Strawbean is currently running \`${commit}\`.\n\n\`${this.primeFactors(parseInt(lol, 16)).join(" * ")} = ${parseInt(lol, 16)}\``
		if (!cache) cache = output;

		return { reply: cache }
	}
})