import * as Types from "../types";

import dateFormats from "../asset/dateFormats.js"; //god, I hate this

export interface ParsedFullResults {
	repeating: boolean;
	offset: number;
	seconds: number;
	message: string;
}

export interface ParsedTimeResults {
	repeating: boolean;
	seconds: number;
}

class Language implements Types.Library {
	name = "language";
	timeRegex = /(\d+)(?::(\d\d))?\s*(p?)/i;
	weekdays = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];

	parseString = (
		input: string,
		locale: string,
		timezone: string,
	): ParsedFullResults => {
		const ret: ParsedFullResults = {
			repeating: false,
			offset: 0,
			seconds: 0,
			message: null,
		};

		if (!input.trim().length) return ret;

		//magic numbers are string lengths
		var absoluteIndex = input.toLowerCase().lastIndexOf(" at ");
		var relativeIndex = input.toLowerCase().lastIndexOf(" in ");
		if (relativeIndex === -1) {
			relativeIndex = input.toLowerCase().lastIndexOf(" every ");
			if (relativeIndex !== -1) ret.repeating = true;
		}

		var parsedAbsolute: Date = null;
		if (absoluteIndex !== -1) {
			//magic number 4 is string length of " at " or " in "
			const absoluteDateString = input.slice(
				absoluteIndex + 4,
				relativeIndex === -1 || relativeIndex < absoluteIndex
					? input.length
					: relativeIndex,
			);
			try {
				parsedAbsolute = this.getValidDate(
					absoluteDateString,
					locale,
					timezone,
				);
				ret.offset = parsedAbsolute.valueOf(); //this will also throw when this.getValidDate returns null, on error
			} catch (e) {
				if (!absoluteDateString.match(this.timeRegex)) {
					absoluteIndex = -1;
					parsedAbsolute = null;
				} else {
					return null;
				}
			}
		}

		//magic number 4 is string length of " at " or " in "
		var relativeDateString = input.slice(relativeIndex).slice(4);
		if (ret.repeating) relativeDateString = relativeDateString.slice(3); //god
		if (
			!relativeDateString &&
			!["am", "pm"].includes(
				input.toLowerCase().split(" ").slice(-1).join(" "),
			)
		) {
			var lastWordIndex = input.lastIndexOf(" ");
			if (lastWordIndex != -1 && lastWordIndex != absoluteIndex + 3) {
				//maybe they wrote 'weekly'/etc
				relativeIndex = lastWordIndex;
				relativeDateString = input.slice(relativeIndex + 1); // + 1 for length of " "

				ret.repeating = false; //bug: repeating reminders become default?

				// fix #22: we assume the last word was removed from the message
				// and add it back later. but this was never done
				input = input.slice(0, lastWordIndex);
			}
		}

		if (relativeIndex < absoluteIndex && relativeIndex != -1) {
			relativeDateString = relativeDateString.slice(
				0,
				relativeDateString.lastIndexOf(input.slice(absoluteIndex)),
			);
		}

		if (relativeIndex < absoluteIndex && relativeIndex != -1)
			ret.message = input.slice(0, relativeIndex);
		else {
			ret.message = input.slice(
				0,
				relativeIndex === -1 ? input.length : relativeIndex,
			);
			ret.message = input.slice(
				0,
				absoluteIndex === -1 ? ret.message.length : absoluteIndex,
			);
		}

		const parsedRelative = this.parseTime(relativeDateString);
		if (!ret.repeating) ret.repeating = parsedRelative.repeating;
		ret.seconds = parsedRelative.seconds;
		if (!ret.seconds && absoluteIndex === -1)
			ret.message += ` ${relativeDateString}`; //was removed before and was not parsed as time

		var startTime = new Date(!ret.offset ? Date.now() : ret.offset);
		var endTime = new Date(startTime.valueOf() + ret.seconds);

		//If the reminder will be sent in the past, they may have used something like
		//remindme test at 5:00AM, after 5AM
		//so they *probably* want the reminder to be sent tomorrow at 5am.
		//Doing the check here rather than in the parseAbsoluteTime function allows the user to do
		//remindme test at 1/10/2021 every week ( where 1/10/2021 is in the past )
		//and the reminder will still work as intended
		if (ret.seconds || ret.offset)
			//if no time was provided at all, we'll want to do this again with the extended flow.
			while (endTime.valueOf() < Date.now() - 60 * 1000)
				endTime.setDate(endTime.getDate() + 1);

		if (this.isDst(new Date(), timezone) && !this.isDst(endTime, timezone))
			endTime.setHours(endTime.getHours() - 1);
		//subtract an hour if we go into daylight savings
		else if (
			!this.isDst(new Date(), timezone) &&
			this.isDst(endTime, timezone)
		)
			endTime.setHours(endTime.getHours() + 1); //add an hour if we come out of daylight savings

		ret.seconds = endTime.valueOf() - startTime.valueOf();

		ret.message = ret.message.trim();

		return ret;
	};

	getValidDate = (input: string, locale: string, timezone: string): Date => {
		if (input === "") return null;

		const split = input.split(" ");
		if (
			split.length > 1 &&
			this.parseTime(split.slice(-1)[0]).seconds &&
			!input.match(this.timeRegex)
		) {
			input = split.slice(0, -1).join(" ");
		}

		locale = locale.toLowerCase();
		const format =
			dateFormats[locale] || dateFormats[process.env.DEFAULT_LOCALE];
		const parsed = this.parseAbsolute(input, format, timezone);
		if (!(parsed instanceof Date) || isNaN(parsed.valueOf())) {
			//invalid date
			//if we can't parse this theres 2 possibilities:
			//* they actually inputted the wrong format date or
			//* they just used the word at in their reminder
			//the second ones probably more common.

			if (!input.match(this.timeRegex)) {
				//all date formats include special characters somewhere
				//and so this check fails they probably didn't mean to use `at [date]`?

				return null;
			} else {
				throw new Error("failed to parse absolute date/time");
			}
		}

		return parsed;
	};

	parseAbsolute = (input: string, format: string, timezone: string): Date => {
		const separator = format
			.split("")
			.find((x) => !["d", "m", "y"].includes(x.toLowerCase()));

		const split = input.split(" ");
		if (
			split[0].indexOf(separator) === -1 &&
			!this.weekdays.includes(split[0].toLowerCase())
		) {
			//bad check if this is not a date or weekday
			var moving = split.shift();
			if (split.length && ["am", "pm"].includes(split[0].toLowerCase())) {
				moving += " " + split.shift();
			}

			split.push(moving);
			input = split.join(" ");
		}

		const formatParts = format.split(separator);
		const parts = input.split(" ")[0].split(separator);

		var time: string;

		if (formatParts[0] === "d" && parts.length > 1) {
			//if we process days first, setting a reminder for a date
			//where the day is greater than the number of days in the current month
			//will cause unexpected behaviour
			//lets just switch the format and the parts to m/d/y

			var day = parts[0];
			formatParts[0] = formatParts[1];
			formatParts[1] = "d";
			parts[0] = parts[1];
			parts[1] = day;
		}

		var out = new Date();
		if (parts.length > 1) {
			//really bad way to detect if they provided time only
			time = input.split(" ").slice(1).join(" ");

			for (
				var i = 0;
				i < Math.min(formatParts.length, parts.length);
				i++
			) {
				const fcurr = formatParts[i][0];
				const curr = parseInt(parts[i]);
				if (!curr) return null;

				switch (fcurr) {
					case "d":
						out.setDate(curr);
						break;
					case "m":
						out.setDate(1); // fix for above
						out.setMonth(curr - 1);
						break;
					case "y":
						//allow '12/11/21' to be parsed as '12/11/2021'
						var year: number = curr;
						if (year.toString().length === 2)
							year = parseInt(
								out.getFullYear().toString().slice(0, 2) +
									year.toString(),
							);

						out.setFullYear(year);
						break;
					default:
						console.error(
							`absolute date parsing found weird character in format uhh ${fcurr}`,
						);
						break;
				}
			}
		} else if (this.weekdays.includes(input.split(" ")[0].toLowerCase())) {
			const split = input.split(" ");
			const day = split.shift().toLowerCase();
			time = split.join(" ");

			var i = this.weekdays.indexOf(day);
			if (i !== -1) {
				out = this.nextWeekday(i);
			}
		} else time = input;

		if (time && time !== "") {
			const parsed = time.match(this.timeRegex);
			if (parseInt(parsed[1]) === 12 && parsed[3]) out.setHours(12);
			//12 + 12 = 24 so next day. other times work fine
			else if (parseInt(parsed[1]) === 12 && !parsed[3])
				out.setHours(0); //same issue
			else out.setHours(parseInt(parsed[1]) + (parsed[3] ? 12 : 0));
			out.setMinutes(parseInt(parsed[2]) || 0);
			out.setSeconds(0, 0);

			//acount for timezone difference with users and host
			//if the user is in the same timezone as the host, this shouldn't change time
			var timezoneOffset = this.getTimezoneOffset(
				timezone || process.env.DEFAULT_TIMEZONE,
			);
			var myOffset = new Date().getTimezoneOffset();
			out = new Date(
				out.getTime() - (myOffset + timezoneOffset) * 60 * 1000,
			); //convert minutes to milliseconds
		}

		return out;
	};

	parseTime = (input: string): ParsedTimeResults => {
		const ret: ParsedTimeResults = {
			repeating: false,
			seconds: 0,
		};

		if (!input || input === "" || input.indexOf("/") !== -1) return ret;

		// ignore commas/placeholders
		input = (input + "").replace(/(\d)[,_](\d)/g, "$1$2");
		const split = input.split(" ");
		let units = 1;
		if (split.length > 1) {
			units = parseInt(split.shift());
			input = split.join(" ");
		}

		const now = new Date();

		const lookup: { [key: string]: () => ParsedTimeResults } = {
			yearly: () => ({ ...lookup["year"](), repeating: true }),
			years: () => lookup["year"](),
			year: () => {
				return {
					seconds: now.setFullYear(now.getFullYear() + units),
					repeating: false,
				};
			},

			monthly: () => ({ ...lookup["month"](), repeating: true }),
			months: () => lookup["month"](),
			month: () => {
				return {
					seconds: now.setMonth(now.getMonth() + units),
					repeating: false,
				};
			},

			fortnightly: () => ({ ...lookup["fortnight"](), repeating: true }),
			fortnights: () => lookup["fortnight"](),
			fortnight: () => {
				return {
					seconds: now.setDate(now.getDate() + 14 * units),
					repeating: false,
				};
			},

			weekly: () => ({ ...lookup["week"](), repeating: true }),
			weeks: () => lookup["week"](),
			week: () => {
				return {
					seconds: now.setDate(now.getDate() + 7 * units),
					repeating: false,
				};
			},

			daily: () => ({ ...lookup["day"](), repeating: true }),
			days: () => lookup["day"](),
			day: () => {
				return {
					seconds: now.setDate(now.getDate() + units),
					repeating: false,
				};
			},

			hourly: () => ({ ...lookup["hour"](), repeating: true }),
			hours: () => lookup["hour"](),
			hour: () => {
				return {
					seconds: now.setHours(now.getHours() + units),
					repeating: false,
				};
			},

			minutes: () => lookup["minute"](),
			minute: () => {
				return {
					seconds: now.setMinutes(now.getMinutes() + units),
					repeating: false,
				};
			},

			seconds: () => lookup["second"](),
			second: () => {
				return {
					seconds: now.setSeconds(now.getSeconds() + units),
					repeating: false,
				};
			},

			tomorrow: () => {
				return {
					seconds: now.setDate(now.getDate() + units),
					repeating: false,
				};
			},
		};

		if (lookup[input]) {
			const out = lookup[input]();
			return {
				seconds: out.seconds - new Date().valueOf(),
				repeating: out.repeating,
			};
		}

		return ret;
	};

	/* https://stackoverflow.com/questions/21327371/get-timezone-offset-from-timezone-name-using-javascript */
	getTimezoneOffset = (timeZone = "UTC", date = new Date()): number => {
		const utcDate = new Date(
			date.toLocaleString("en-US", { timeZone: "UTC" }),
		);
		const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
		return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
	};

	isDst = (date: Date, timezone: string = process.env.DEFAULT_TIMEZONE) => {
		var me = this.getTimezoneOffset(timezone, date);
		var jan = this.getTimezoneOffset(
			timezone,
			new Date(date.getFullYear(), 0, 1),
		);
		var jul = this.getTimezoneOffset(
			timezone,
			new Date(date.getFullYear(), 6, 1),
		);
		return Math.max(jan, jul) != me;
	};

	nextWeekday = (day: number, now = new Date()) => {
		now.setDate(now.getDate() + ((day + (7 - now.getDay())) % 7));
		return now;
	};
}

export default new Language();
