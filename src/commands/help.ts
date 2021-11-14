import * as Types from "../types"

export default new (class help implements Types.Command {
	name = "help";
	usage = "[\"all\" || command]";
	help = "You know what you did. You cannot take it back. You must live with your sins.";
	commandChainingLimit = 0;
	exec = async ({ args, Env }: Types.CommandContext) => {
		const usageHelp = `\`{}\` = required. \`[]\` = optional. \`""\` = literal. \`||\` = or.`;

		var otherPages = {
			chaining:
				`Strawbean allows you to run multiple commands one after the other in a single message.\n` +
				`To do so, simply separate each command with a semicolon ( \`;\` ).\n` +
				`You cannot run more than 5 commands in a single message. Additionally, some commands such as \`help\` and \`list\` can only be run once.\n` +
				`For example: \n` +
				`\`\`\`remind do your homework in 1 week; tag latest school; list school\`\`\`\n` +
				`The above will create a reminder, tag it, and then list all the reminders in this tag.`,
			notes:
				`Notes are essentially reminders that will never send, and as such are never deleted.\n` +
				`You can create a note by using the dedicated \`note\` command, or by tagging a normal reminder as a note.\n` +
				`Tagging a reminder as \`note\` will not delete the reminder, even if they should have sent.\n` + 
				`You can also change such reminder back into a regular reminder by changing its tag.\n\n` +
				`Notes will only appear in \`list note\`, rather than \`list all\` or \`list\`.\n` +
				`Additionally, using \`remove all\`, \`tag all\`, and other such commands will not tag notes.`,
		}

		if (otherPages[args[0]]) {
			return { reply: otherPages[args[0]] };
		}

		if (Env.commands[args[0]]) {
			return {
				reply: `${usageHelp}\n\n` +
					(Env.commands[args[0]].usage ? `\`${args[0]} ${Env.commands[args[0]].usage}\`\n\n` : "") +
					`${Env.commands[args[0]].help}\n` +
					(Env.commands[args[0]].examples ? `\`\`\`${Env.commands[args[0]].examples.map(x => "* " + x).join("\n")}\`\`\`` : "")
			};
		}

		if (args[0] === "all") {
			return {
				reply: "**Command Directory.**\nUse \`help [command]\` to view more indepth information about that command.\n" +
					`${usageHelp}\n\n\`\`\`` +
					Object.entries(Env.commands).filter(x => !x[1].owner).map(x => `* ${x[0]}${x[1].usage ? " " + x[1].usage : ""}`).join("\n") + "\`\`\`"
			}
		}

		const common = [
			"remind",
			"list",
			"desc",
			"remove",
			"tag",
			"timezone",
			"locale",
		]

		return {
			reply: {
				embeds: [{
					title: "**Common Commands and Usage**",
					description: `For a complete command list, use \`help all\`.\n` +
						`Use \`help [page]\` for more indepth help on a specific command.\n\n` +
						`You may also want to read about other features, listed below:\n\`\`\`` +
						Object.keys(otherPages).map(x => "* " + x).join("\n") + "\`\`\`\n" +
						`\`{}\` = required. \`[]\` = optional. \`""\` = literal. \`||\` = or.`,
					fields: [
						...common.map(x => ({
							name: "```" + x + " " + Env.commands[x].usage + "```",
							value: Env.commands[x].help,
						}))
					]
				}]
			}
		}
	}
})