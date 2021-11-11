import * as Types from "../types"

import { execSync } from 'child_process'

export default new (class timezone implements Types.Command {
	name = "commit";
	usage = "";
	commandChainingLimit = 0;
	getCommit = () => {
		try {
			return execSync("git rev-parse HEAD").toString().trim();
		}
		catch (e) {
			var string = process.env.HEROKU_SLUG_COMMIT + " : " + process.env.HEROKU_RELEASE_VERSION;
			return string === " : " ? "" : string;
		}
	}
	exec = async (Context: Types.CommandContext) => {
		const commit = this.getCommit().slice(0, 7);
		return { reply: `Strawbean is currently running \`${commit ? commit : "could not get commit hash"}\`` }
	}
})