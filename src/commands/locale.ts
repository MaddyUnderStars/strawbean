import * as Types from "../types"

//Why isn't this included?
declare namespace Intl {
	function getCanonicalLocales(locales: string | string[]): string[];
}

export default new (class locale implements Types.Command {
	name = "locale";
	usage = "{locale. Eg: en-AU. See: https://github.com/ladjs/i18n-locales}";
	exec = async ({ user, args, Env }: Types.CommandContext) => {
		if (!args[0]) args[0] = "Australia/Sydney"

		try {
			Intl.getCanonicalLocales(args[0]);
		}
		catch (e) {
			return { reply: "Invalid locale string" }
		}

		user.locale = args[0];
		Env.db.collection("users").updateOne({ _id: user._id }, { $set: { locale: user.locale } });
		return { reply: `Locale set to \`${user.locale}\`` }
	}
})