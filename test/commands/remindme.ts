import test from "ava";
import { Message, testReminder } from "../lib/discordmock";
import { setupTests } from "../lib/setup";

setupTests(test);

test("in [time]", async (t) => {
	const now = new Date();
	const units = [
		["year", (i) => new Date().setFullYear(now.getFullYear() + i)],
		["month", (i) => new Date().setMonth(now.getMonth() + i)],
		["fortnight", (i) => new Date().setDate(now.getDate() + 14 * i)],
		["week", (i) => new Date().setDate(now.getDate() + 7 * i)],
		["day", (i) => new Date().setDate(now.getDate() + i)],
		["hour", (i) => new Date().setHours(now.getHours() + i)],
	] as [string, (i: number) => number][];

	var i = 0;
	for (var unit of units) {
		i++;
		const [name, time] = unit;
		const expected = new Date(time(i));
		const msg = new Message(`remindme test in ${i} ${name}`);
		await testReminder.exec(t, msg, expected, true);
	}
});

test("at [date]", async (t) => {
	var now = new Date();
	for (var year = now.getFullYear(); year < now.getFullYear() + 1; year++) {
		for (var month = 0; month < 12; month++) {
			const thisMonth = new Date(year, month + 1, -1);
			for (var day = 1; day <= thisMonth.getDate(); day++) {
				const expected = new Date(
					year,
					month,
					day,
					new Date().getHours(),
					new Date().getMinutes(),
					new Date().getSeconds(),
				);

				const msg = new Message(
					`remindme test at ${day}/${month + 1}/${year}`,
				);
				await testReminder.exec(t, msg, expected, false);
			}
		}
	}
});

test("at [date] [time]", async (t) => {
	var now = new Date();
	for (var month = now.getMonth(); month < now.getMonth() + 1; month++) {
		const thisMonth = new Date(now.getFullYear(), month + 1, -1);
		for (var day = 1; day <= thisMonth.getDate(); day++) {
			for (var hour = 0; hour < 24; hour++) {
				const expected = new Date(
					now.getFullYear(),
					month,
					day,
					hour,
					0,
					0,
				);

				const inputString = expected
					.toLocaleString(process.env.DEFAULT_LOCALE, {
						timeZone: process.env.DEFAULT_TIMEZONE,
						dateStyle: "short",
						timeStyle: "short",
					})
					.split(",")
					.join("");
				const msg = new Message(`remindme test at ${inputString}`);
				await testReminder.exec(t, msg, expected, false);
			}
		}
	}
});

test("at [date] [time] in [time]", async (t) => {
	const now = new Date();
	const units = [
		["year", (i) => new Date().setFullYear(now.getFullYear() + i)],
		["month", (i) => new Date().setMonth(now.getMonth() + i)],
		["fortnight", (i) => new Date().setDate(now.getDate() + 14 * i)],
		["week", (i) => new Date().setDate(now.getDate() + 7 * i)],
		["day", (i) => new Date().setDate(now.getDate() + i)],
		["hour", (i) => new Date().setHours(now.getHours() + i)],
	] as [string, (i: number) => number][];

	for (var unit of units) {
		const [name, time] = unit;
		for (var i = 1; i <= 12; i++) {
			for (
				var month = now.getMonth();
				month < now.getMonth() + 1;
				month++
			) {
				const expected = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					now.getHours(),
					0,
				);

				const inputString = expected
					.toLocaleString(process.env.DEFAULT_LOCALE, {
						timeZone: process.env.DEFAULT_TIMEZONE,
						dateStyle: "short",
						timeStyle: "short",
					})
					.split(",")
					.join("");
				const msg = new Message(
					`remindme test at ${inputString} in ${i} ${name}`,
				);

				const ret = new Date(time(i));
				ret.setMinutes(0);
				ret.setSeconds(0);

				await testReminder.exec(t, msg, ret, false);
			}
		}
	}
});

test("in [time] at [date] [time] ", async (t) => {
	const now = new Date();
	const units = [
		["year", (i) => new Date().setFullYear(now.getFullYear() + i)],
		["month", (i) => new Date().setMonth(now.getMonth() + i)],
		["fortnight", (i) => new Date().setDate(now.getDate() + 14 * i)],
		["week", (i) => new Date().setDate(now.getDate() + 7 * i)],
		["day", (i) => new Date().setDate(now.getDate() + i)],
		["hour", (i) => new Date().setHours(now.getHours() + i)],
	] as [string, (i: number) => number][];

	for (var unit of units) {
		const [name, time] = unit;

		for (var i = 1; i <= 12; i++) {
			for (
				var month = now.getMonth();
				month < now.getMonth() + 1;
				month++
			) {
				const expected = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					now.getHours(),
					0,
				);

				const inputString = expected
					.toLocaleString(process.env.DEFAULT_LOCALE, {
						timeZone: process.env.DEFAULT_TIMEZONE,
						dateStyle: "short",
						timeStyle: "short",
					})
					.split(",")
					.join("");
				const msg = new Message(
					`remindme test in ${i} ${name} at ${inputString} `,
				);

				const ret = new Date(time(i));
				ret.setMinutes(0);
				ret.setSeconds(0);

				await testReminder.exec(t, msg, ret, false);
			}
		}
	}
});

test("at [time] [date]", async (t) => {
	const expected = new Date();
	expected.setSeconds(0);

	const timeString = expected.toLocaleTimeString(process.env.DEFAULT_LOCALE, {
		timeZone: process.env.DEFAULT_TIMEZONE,
		timeStyle: "short",
	});
	const dateString = expected.toLocaleDateString(process.env.DEFAULT_LOCALE, {
		timeZone: process.env.DEFAULT_TIMEZONE,
		dateStyle: "short",
	});
	const msg = new Message(`remindme test at ${timeString} ${dateString}`);
	await testReminder.exec(t, msg, expected, false);
});

test("[unit]", async (t) => {
	const now = new Date();
	const units = [
		["year", new Date().setFullYear(now.getFullYear() + 1)],
		["month", new Date().setMonth(now.getMonth() + 1)],
		["fortnight", new Date().setDate(now.getDate() + 14)],
		["week", new Date().setDate(now.getDate() + 7)],
		["day", new Date().setDate(now.getDate() + 1)],
		["tomorrow", new Date().setDate(now.getDate() + 1)],
		["hour", new Date().setHours(now.getHours() + 1)],
	] as [string, number][];

	for (var unit of units) {
		const [name, time] = unit;
		const expected = new Date(time);
		const msg = new Message(`remindme test every ${name}`);
		await testReminder.exec(
			t,
			msg,
			expected,
			name === "tomorrow" ? false : true,
		);
	}
});

test("at [weekday]", async (t) => {
	const days = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];

	const nextWeekday = (day, now = new Date()) => {
		now.setDate(now.getDate() + ((day + (7 - now.getDay())) % 7));
		return now;
	};

	for (var i = 0; i < days.length; i++) {
		const expected = nextWeekday(i);
		const msg = new Message(`remindme test at ${days[i]}`);
		await testReminder.exec(t, msg, expected, false);
	}
});

test("every [unit]", async (t) => {
	const now = new Date();
	const units = [
		["year", new Date().setFullYear(now.getFullYear() + 1)],
		["month", new Date().setMonth(now.getMonth() + 1)],
		["fortnight", new Date().setDate(now.getDate() + 14)],
		["week", new Date().setDate(now.getDate() + 7)],
		["day", new Date().setDate(now.getDate() + 1)],
		["hour", new Date().setHours(now.getHours() + 1)],
	] as [string, number][];

	for (var unit of units) {
		const [name, time] = unit;
		const expected = new Date(time);
		const msg = new Message(`remindme test every ${name}`);
		await testReminder.exec(t, msg, expected, true);
	}
});
