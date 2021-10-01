import * as Types from "../types"

import parse from 'parse-duration'

export default new (class remind implements Types.Command {
	name = "remind";
	usage = "{description} [\"at\" [date] [time]] {\"in\" or \"every\"} {time}. Eg: remind me to hug everyone in 1 hour. Eg: remind me vibe at 20/09/2021 5:00pm every 1 day.";

	parseTime = (time: string): [boolean, number] => {		//lol
		var repeating = false;
		if (parse[time]) time = "1 " + time;	//fixes "remindme test every week"
		var seconds = parse(time);
		if (!seconds) {
			// ok, we've probably got some dumb string
			// such as 'weekly', so lets handle that.

			repeating = true;

			if (time === "yearly")
				seconds = 365 * 24 * 60 * 60 * 1000;
			else if (time === "monthly")
				seconds = 30 * 24 * 60 * 60 * 1000;
			else if (time === "fortnightly")
				seconds = 2 * 7 * 24 * 60 * 60 * 1000;
			else if (time === "weekly")
				seconds = 7 * 24 * 60 * 60 * 1000;
			else if (time === "daily")
				seconds = 24 * 60 * 60 * 1000;
			else if (time === "hourly")
				seconds = 60 * 60 * 1000;
			else if (time === "tomorrow") {
				repeating = false;	//lol
				seconds = 24 * 60 * 60 * 1000;
			}
		}

		return [repeating, seconds];
	}

	/* https://stackoverflow.com/questions/21327371/get-timezone-offset-from-timezone-name-using-javascript */
	getOffset = (timeZone = 'UTC', date = new Date()): number => {
		const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
		const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
		return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
	}

	parseAbsoluteTime = (dateString: string, format: string, timezone: string): Date => {
		const separator = format.split("").find(x => !(['d', 'm', 'y'].includes(x.toLowerCase())));
		var formatParts = format.split(separator);
		var parts = dateString.split(" ")[0].split(separator);

		var time: string;

		var out = new Date();
		if (parts.length > 1) {	//really bad way to detect if they provided time only
			time = dateString.split(" ").slice(1).join(" ");

			for (var i = 0; i < Math.min(formatParts.length, parts.length); i++) {
				var fcurr = formatParts[i];
				var curr = parts[i];
				switch (fcurr[0]) {	//lol my god
					case 'd':
						out.setDate(parseInt(curr));
						break;
					case 'm':
						out.setMonth(parseInt(curr) - 1);
						break;
					case 'y':
						out.setFullYear(parseInt(curr));
						break;
					default:
						console.log(`absolute date parsing got weird character in format, uhh ${fcurr}`)
				}
			}
		}
		else {
			time = dateString;
		}

		if (time && time !== "") {
			var parsed = time.match(/(\d+)(?::(\d\d))?\s*(p?)/i);
			out.setHours(parseInt(parsed[1]) + (parsed[3] ? 12 : 0));
			out.setMinutes(parseInt(parsed[2]) || 0);
			out.setSeconds(0, 0)
		}

		//acount for timezone difference with users and host
		//if the user is in the same timezone as the host, this shouldn't change time
		var timezoneOffset = this.getOffset(timezone || "Australia/Sydney");
		var myOffset = (new Date()).getTimezoneOffset();
		out = new Date(out.getTime() - ((myOffset + timezoneOffset) * 60 * 1000));	//convert minutes to milliseconds

		return out;
	}

	isDst = (date: Date, timezone: string = "Australia/Sydney") => {
		var me = this.getOffset(timezone, date)
		var jan = this.getOffset(timezone, new Date(date.getFullYear(), 0, 1));
		var jul = this.getOffset(timezone, new Date(date.getFullYear(), 6, 1));
		return Math.max(jan, jul) != me;
	}

	exec = async ({ user, args, Libs, msg }: Types.CommandContext) => {
		if (args[0] && args[0].toLowerCase() === "me") args.shift();

		var inGuild = false;
		if (args[0] && args[0].toLowerCase() === "here") {
			inGuild = !!msg.guild;	//lol
			args.shift();
		}

		if (args[0] && args[0].toLowerCase() === "to") args.shift();

		var repeating = false;

		var all = args.join(" ");

		var datePos = all.toLowerCase().lastIndexOf(" at ");
		var pos = all.toLowerCase().lastIndexOf(" in ")
		if (pos === -1) {
			pos = all.toLowerCase().lastIndexOf(" every ");
			if (pos !== -1)
				repeating = true;
		}

		var offsetTime: Date = null;
		if (datePos !== -1) {
			//getting absolute time ( offset time )
			var timeString = all.slice(datePos + 4, pos === -1 ? all.length : pos)
			//really dumb check for if 'weekly' got included in this timeString
			if (timeString.split(" ").length > 1 &&
				this.parseTime(timeString.split(" ").pop())[1] &&
				!timeString.match(/(\d+)(?::(\d\d))?\s*(p?)/i)) {
				timeString = timeString.split(" ").slice(0, -1).join(" ")
			}
			const format = dateFormats[user.locale.toLowerCase()] || dateFormats['en-au'];
			try {
				offsetTime = this.parseAbsoluteTime(timeString, format, user.timezone);
				if (!(offsetTime instanceof Date && !isNaN(offsetTime.valueOf()))) { //invalid date
					throw 'bad'
				}
			}
			catch (e) {
				return { reply: `We couldn't parse that, sorry. Make sure you're following the format \`${format} HH:MM (AM/PM)\`` }
			}
		}

		var time = all.slice(pos).slice(4)
		if (repeating) time = time.slice(3);
		if (!time && !(["am", "pm"].includes(all.toLowerCase().split(" ").slice(-1).join(" ")))) { //maybe they wrote 'weekly' or smth
			pos = all.lastIndexOf(" ");
			time = all.slice(pos + 1);
		}

		var message = all.slice(0, pos === -1 ? all.length : pos);
		var message = all.slice(0, datePos === -1 ? message.length : datePos);

		if (!message) {
			await msg.reply("Sorry, what should the reminder's description be?");
			try {
				var m = await msg.channel.awaitMessages({
					filter: m => m.author.id === user._id,
					max: 1,
					time: 30000,
					errors: ["time"]
				})
				message = m.first().content;
			}
			catch (e) {
				return { reply: "Sorry, reply timed out." }
			}
		}

		var [r, seconds] = this.parseTime(time);
		if (!repeating) repeating = r;	//bug: "remindme test every ..." breaks because overwritten by parseTime function

		var offsetProvideInsteadOfTime = pos === -1 && !!offsetTime
		if (!seconds && !offsetProvideInsteadOfTime) {
			await msg.reply("Sorry, when should your reminder be sent?");
			try {
				var m = await msg.channel.awaitMessages({
					filter: m => m.author.id === user._id,
					max: 1,
					time: 30000,
					errors: ["time"]
				})
				var [repeating, seconds] = this.parseTime(m.first().content);
			}
			catch (e) {
				return { reply: "Sorry, reply timed out." }
			}
		}

		if (!seconds && !offsetProvideInsteadOfTime) {
			//ok so we're useless lets tell them
			return { reply: "Sorry, the time you entered couldn't be properly interpreted. Try using `remindme` without any arguments to use the extended flow." }
		}

		if (repeating)
			if (!msg.guild || !msg.member.permissions.has("ADMINISTRATOR"))
				inGuild = false;

		var startTime = new Date(!offsetTime ? Date.now() : offsetTime.valueOf());
		var endTime = new Date(startTime.valueOf() + seconds);

		if (this.isDst(startTime, user.timezone) && !this.isDst(endTime, user.timezone))
			seconds -= 1000 * 60 * 60;	//subtract an hour if we go into daylight savings
		else if (!this.isDst(startTime, user.timezone) && this.isDst(endTime, user.timezone))
			seconds += 1000 * 60 * 60;	//add an hour if we come out of daylight savings

		var ret = await Libs.reminders.add({
			owner: msg.author.id,
			name: message.split("`").join("'"),
			time: seconds,
			repeating: repeating,
			url: msg.url,
			channel: inGuild ? msg.channel.id : null,
			setTime: !offsetTime ? Date.now() : offsetTime.valueOf(),
		})
		// in order to show the reminder id, we need to annoyingly call Libs.reminders.getAll() and find the newly created reminder
		var id = (await Libs.reminders.getAll(msg.author.id)).filter(x => x._id.toString() === ret._id.toString())[0].remove_id + 1
		var embed = Libs.reminders.prettyPrint(ret)
		embed.embeds[0].title = `#${id} ${embed.embeds[0].title}`

		return { reply: embed }
	}
})

//https://stackoverflow.com/questions/2388115/get-locale-short-date-format-using-javascript
const dateFormats = {
	"af-za": "yyyy/mm/dd",
	"am-et": "d/m/yyyy",
	"ar-ae": "dd/mm/yyyy",
	"ar-bh": "dd/mm/yyyy",
	"ar-dz": "dd-mm-yyyy",
	"ar-eg": "dd/mm/yyyy",
	"ar-iq": "dd/mm/yyyy",
	"ar-jo": "dd/mm/yyyy",
	"ar-kw": "dd/mm/yyyy",
	"ar-lb": "dd/mm/yyyy",
	"ar-ly": "dd/mm/yyyy",
	"ar-ma": "dd-mm-yyyy",
	"ar-om": "dd/mm/yyyy",
	"ar-qa": "dd/mm/yyyy",
	"ar-sa": "dd/mm/yy",
	"ar-sy": "dd/mm/yyyy",
	"ar-tn": "dd-mm-yyyy",
	"ar-ye": "dd/mm/yyyy",
	"arn-cl": "dd-mm-yyyy",
	"as-in": "dd-mm-yyyy",
	"az-cyrl-az": "dd.mm.yyyy",
	"az-latn-az": "dd.mm.yyyy",
	"ba-ru": "dd.mm.yy",
	"be-by": "dd.mm.yyyy",
	"bg-bg": "dd.m.yyyy",
	"bn-bd": "dd-mm-yy",
	"bn-in": "dd-mm-yy",
	"bo-cn": "yyyy/m/d",
	"br-fr": "dd/mm/yyyy",
	"bs-cyrl-ba": "d.m.yyyy",
	"bs-latn-ba": "d.m.yyyy",
	"ca-es": "dd/mm/yyyy",
	"co-fr": "dd/mm/yyyy",
	"cs-cz": "d.m.yyyy",
	"cy-gb": "dd/mm/yyyy",
	"da-dk": "dd-mm-yyyy",
	"de-at": "dd.mm.yyyy",
	"de-ch": "dd.mm.yyyy",
	"de-de": "dd.mm.yyyy",
	"de-li": "dd.mm.yyyy",
	"de-lu": "dd.mm.yyyy",
	"dsb-de": "d. m. yyyy",
	"dv-mv": "dd/mm/yy",
	"el-gr": "d/m/yyyy",
	"en-029": "mm/dd/yyyy",
	"en-au": "d/mm/yyyy",
	"en-bz": "dd/mm/yyyy",
	"en-ca": "dd/mm/yyyy",
	"en-gb": "dd/mm/yyyy",
	"en-ie": "dd/mm/yyyy",
	"en-in": "dd-mm-yyyy",
	"en-jm": "dd/mm/yyyy",
	"en-my": "d/m/yyyy",
	"en-nz": "d/mm/yyyy",
	"en-ph": "m/d/yyyy",
	"en-sg": "d/m/yyyy",
	"en-tt": "dd/mm/yyyy",
	"en-us": "m/d/yyyy",
	"en-za": "yyyy/mm/dd",
	"en-zw": "m/d/yyyy",
	"es-ar": "dd/mm/yyyy",
	"es-bo": "dd/mm/yyyy",
	"es-cl": "dd-mm-yyyy",
	"es-co": "dd/mm/yyyy",
	"es-cr": "dd/mm/yyyy",
	"es-do": "dd/mm/yyyy",
	"es-ec": "dd/mm/yyyy",
	"es-es": "dd/mm/yyyy",
	"es-gt": "dd/mm/yyyy",
	"es-hn": "dd/mm/yyyy",
	"es-mx": "dd/mm/yyyy",
	"es-ni": "dd/mm/yyyy",
	"es-pa": "mm/dd/yyyy",
	"es-pe": "dd/mm/yyyy",
	"es-pr": "dd/mm/yyyy",
	"es-py": "dd/mm/yyyy",
	"es-sv": "dd/mm/yyyy",
	"es-us": "m/d/yyyy",
	"es-uy": "dd/mm/yyyy",
	"es-ve": "dd/mm/yyyy",
	"et-ee": "d.mm.yyyy",
	"eu-es": "yyyy/mm/dd",
	"fa-ir": "mm/dd/yyyy",
	"fi-fi": "d.m.yyyy",
	"fil-ph": "m/d/yyyy",
	"fo-fo": "dd-mm-yyyy",
	"fr-be": "d/mm/yyyy",
	"fr-ca": "yyyy-mm-dd",
	"fr-ch": "dd.mm.yyyy",
	"fr-fr": "dd/mm/yyyy",
	"fr-lu": "dd/mm/yyyy",
	"fr-mc": "dd/mm/yyyy",
	"fy-nl": "d-m-yyyy",
	"ga-ie": "dd/mm/yyyy",
	"gd-gb": "dd/mm/yyyy",
	"gl-es": "dd/mm/yy",
	"gsw-fr": "dd/mm/yyyy",
	"gu-in": "dd-mm-yy",
	"ha-latn-ng": "d/m/yyyy",
	"he-il": "dd/mm/yyyy",
	"hi-in": "dd-mm-yyyy",
	"hr-ba": "d.m.yyyy.",
	"hr-hr": "d.m.yyyy",
	"hsb-de": "d. m. yyyy",
	"hu-hu": "yyyy. mm. dd.",
	"hy-am": "dd.mm.yyyy",
	"id-id": "dd/mm/yyyy",
	"ig-ng": "d/m/yyyy",
	"ii-cn": "yyyy/m/d",
	"is-is": "d.m.yyyy",
	"it-ch": "dd.mm.yyyy",
	"it-it": "dd/mm/yyyy",
	"iu-cans-ca": "d/m/yyyy",
	"iu-latn-ca": "d/mm/yyyy",
	"ja-jp": "yyyy/mm/dd",
	"ka-ge": "dd.mm.yyyy",
	"kk-kz": "dd.mm.yyyy",
	"kl-gl": "dd-mm-yyyy",
	"km-kh": "yyyy-mm-dd",
	"kn-in": "dd-mm-yy",
	"ko-kr": "yyyy. mm. dd",
	"kok-in": "dd-mm-yyyy",
	"ky-kg": "dd.mm.yy",
	"lb-lu": "dd/mm/yyyy",
	"lo-la": "dd/mm/yyyy",
	"lt-lt": "yyyy.mm.dd",
	"lv-lv": "yyyy.mm.dd.",
	"mi-nz": "dd/mm/yyyy",
	"mk-mk": "dd.mm.yyyy",
	"ml-in": "dd-mm-yy",
	"mn-mn": "yy.mm.dd",
	"mn-mong-cn": "yyyy/m/d",
	"moh-ca": "m/d/yyyy",
	"mr-in": "dd-mm-yyyy",
	"ms-bn": "dd/mm/yyyy",
	"ms-my": "dd/mm/yyyy",
	"mt-mt": "dd/mm/yyyy",
	"nb-no": "dd.mm.yyyy",
	"ne-np": "m/d/yyyy",
	"nl-be": "d/mm/yyyy",
	"nl-nl": "d-m-yyyy",
	"nn-no": "dd.mm.yyyy",
	"nso-za": "yyyy/mm/dd",
	"oc-fr": "dd/mm/yyyy",
	"or-in": "dd-mm-yy",
	"pa-in": "dd-mm-yy",
	"pl-pl": "dd.mm.yyyy",
	"prs-af": "dd/mm/yy",
	"ps-af": "dd/mm/yy",
	"pt-br": "d/m/yyyy",
	"pt-pt": "dd-mm-yyyy",
	"qut-gt": "dd/mm/yyyy",
	"quz-bo": "dd/mm/yyyy",
	"quz-ec": "dd/mm/yyyy",
	"quz-pe": "dd/mm/yyyy",
	"rm-ch": "dd/mm/yyyy",
	"ro-ro": "dd.mm.yyyy",
	"ru-ru": "dd.mm.yyyy",
	"rw-rw": "m/d/yyyy",
	"sa-in": "dd-mm-yyyy",
	"sah-ru": "mm.dd.yyyy",
	"se-fi": "d.m.yyyy",
	"se-no": "dd.mm.yyyy",
	"se-se": "yyyy-mm-dd",
	"si-lk": "yyyy-mm-dd",
	"sk-sk": "d. m. yyyy",
	"sl-si": "d.m.yyyy",
	"sma-no": "dd.mm.yyyy",
	"sma-se": "yyyy-mm-dd",
	"smj-no": "dd.mm.yyyy",
	"smj-se": "yyyy-mm-dd",
	"smn-fi": "d.m.yyyy",
	"sms-fi": "d.m.yyyy",
	"sq-al": "yyyy-mm-dd",
	"sr-cyrl-ba": "d.m.yyyy",
	"sr-cyrl-cs": "d.m.yyyy",
	"sr-cyrl-me": "d.m.yyyy",
	"sr-cyrl-rs": "d.m.yyyy",
	"sr-latn-ba": "d.m.yyyy",
	"sr-latn-cs": "d.m.yyyy",
	"sr-latn-me": "d.m.yyyy",
	"sr-latn-rs": "d.m.yyyy",
	"sv-fi": "d.m.yyyy",
	"sv-se": "yyyy-mm-dd",
	"sw-ke": "m/d/yyyy",
	"syr-sy": "dd/mm/yyyy",
	"ta-in": "dd-mm-yyyy",
	"te-in": "dd-mm-yy",
	"tg-cyrl-tj": "dd.mm.yy",
	"th-th": "d/m/yyyy",
	"tk-tm": "dd.mm.yy",
	"tn-za": "yyyy/mm/dd",
	"tr-tr": "dd.mm.yyyy",
	"tt-ru": "dd.mm.yyyy",
	"tzm-latn-dz": "dd-mm-yyyy",
	"ug-cn": "yyyy-m-d",
	"uk-ua": "dd.mm.yyyy",
	"ur-pk": "dd/mm/yyyy",
	"uz-cyrl-uz": "dd.mm.yyyy",
	"uz-latn-uz": "dd/mm yyyy",
	"vi-vn": "dd/mm/yyyy",
	"wo-sn": "dd/mm/yyyy",
	"xh-za": "yyyy/mm/dd",
	"yo-ng": "d/m/yyyy",
	"zh-cn": "yyyy/m/d",
	"zh-hk": "d/m/yyyy",
	"zh-mo": "d/m/yyyy",
	"zh-sg": "d/m/yyyy",
	"zh-tw": "yyyy/m/d",
	"zu-za": "yyyy/mm/dd",
};