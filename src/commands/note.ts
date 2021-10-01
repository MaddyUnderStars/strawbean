import * as Types from "../types"

export default new (class note implements Types.Command {
	name = "note";
	usage = "{note name} [':' note description]";
	exec = async ({ user, args, Libs, msg }: Types.CommandContext) => {
		var pos = args.indexOf(":");
		var noteName = args.slice(0, pos === -1 ? args.length : pos)
		var noteDesc = args.slice(pos + 1, pos === -1 ? 0 : args.length);

		var res = await Libs.reminders.addNote({
			name: noteName.join(" "),
			description: noteDesc.join(" "),
			url: msg.url,
			owner: user._id,
		})

		return { reply: Libs.reminders.prettyPrint(res as Types.Note) }
	}
})