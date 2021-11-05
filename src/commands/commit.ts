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
			return "";
		}
	}
	exec = async (Context: Types.CommandContext) => {
		const commit = this.getCommit().slice(0, 7);
		return { reply: `Strawbean is currently running \`${commit ? commit : "git is not installed"}\`` }
	}
})