import * as Types from "../types"

import { execSync } from 'child_process'

var cache: string = null;

export default new (class timezone implements Types.Command {
	name = "commit";
	usage = "";
	commandChainingLimit = 0;
	help = "Display version information for Strawbean.";
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
		if (!cache) cache = commit;	//lets not spam our logs if git can't be used
		return { reply: `Strawbean is currently running \`${commit ? commit : "could not get commit hash"}\`` }
	}
})