import prettyMilliseconds from "pretty-ms";

import * as Discord from "discord.js";
import * as Mongodb from "mongodb";
import * as Types from "../types";

class Reminders implements Types.Library {
	name = "reminders";
	timeout = 5 * 1000; //5 seconds

	collection: Mongodb.Collection<Types.Reminder | Types.Note> = null;
	adminDb: Mongodb.Admin = null;
	deleteCache: {
		[key: string]: {
			[key: string]: Types.Reminder;
		};
	} = {};

	timeOptions = {
		"30 minutes": () => 30 * 60 * 1000,
		"1 hour": () => 60 * 60 * 1000,
		"2 hours": () => 2 * 60 * 60 * 1000,
		"6 hours": () => 6 * 60 * 60 * 1000,
		"12 hours": () => 12 * 60 * 60 * 1000,
		"24 hours": () => 24 * 60 * 60 * 1000,
		"1 week": () => 7 * 24 * 60 * 60 * 1000,
		"1 month": () => {
			var now = new Date();
			now.setMonth(now.getMonth() + 1);
			return now.valueOf() - Date.now();
		},
		"2 months": () => {
			var now = new Date();
			now.setMonth(now.getMonth() + 2);
			return now.valueOf() - Date.now();
		},
		"1 year": () => {
			var now = new Date();
			now.setFullYear(now.getFullYear() + 1);
			return now.valueOf() - Date.now();
		},
	};

	exec = async (Env: Types.Environment, client: Discord.Client) => {
		client.on(
			"interactionCreate",
			async (interaction: Discord.Interaction) => {
				if (interaction.isContextMenu())
					return await this.handleContextMenu(interaction);

				if (!interaction.isButton() && !interaction.isSelectMenu())
					return;

				if (interaction.user.bot) return;
				if (interaction.user.partial) await interaction.user.fetch();

				try {
					await this.handleButtons(interaction);
				} catch (e) {
					return await interaction.reply({
						content:
							"Sorry, this reminder isn't for you ( and it if was, its stale. you'll have to make a new one )",
						ephemeral: true,
					});
				}
			},
		);

		this.collection = Env.db.collection("reminders");
		this.adminDb = Env.db.admin();

		if (process.env.NODE_ENV === "production")
			await client.application.commands.set(this.generateContextMenu());
	};

	interval = async (Env: Types.Environment, client: Discord.Client) => {
		try {
			if (!(await this.adminDb.ping()))
				return console.error(
					"Mongo isn't connected. I wont attempt to send reminders to prevent errors.",
				);
		} catch (e) {
			//yeah I know, dupe code. but honestly the ping function shouldn't throw it should just return false if not connected
			return console.error(
				"Mongo isn't connected. I wont attempt to send reminders to prevent errors.",
			);
		}

		if (
			(await this.collection.countDocuments({
				time: { $lt: Date.now() },
			})) == 0
		)
			return;

		var reminders = this.collection.find({ time: { $lt: Date.now() } });

		while (await reminders.hasNext()) {
			const reminder = (await reminders.next()) as Types.Reminder;

			var channel: Discord.TextChannel | Discord.DMChannel = null;

			//Notes don't normally have times, and so this was once a reminder with a time that had its tag set to note
			if (reminder.tag === "note") continue;

			//hmm large try catch, whatever
			try {
				if (reminder.channel)
					channel = (await client.channels.fetch(
						reminder.channel,
					)) as Discord.TextChannel;

				var user: Discord.User = await client.users.fetch(
					reminder.owner,
				);
				if (!channel)
					channel = (await user.createDM()) as Discord.DMChannel;

				// //this is TERRIBLE. TODO: Put 'remove_id' in the db, rather than generating it on the fly.
				// var remove_id = (await me.getAll(user.id)).find(x => x._id.toString() === reminder._id.toString()).remove_id + 1;

				var short =
					reminder.name.length > 50
						? reminder.name.substring(0, 51) + " ..."
						: reminder.name;

				var embed = new Discord.MessageEmbed({
					title: !reminder.description ? `Reminder` : reminder.name,
					description: !reminder.description
						? reminder.name
						: "`" + reminder.description + "`",
					timestamp: reminder.setTime,
					url: reminder.url,
					footer: {
						text: reminder.tag,
					},
					color: 0x00ff00,
				});

				var msg = await channel.send({
					content: `\`${short}\` - <@${reminder.owner}>`,
					embeds: [embed],
					components: [
						reminder.repeating
							? this.generateRemoveButton()
							: this.generateRepeatButtons(),
					],
				});

				await this.collection.updateOne(
					{ _id: reminder._id },
					{ $set: { msgAwaitReaction: msg.id } },
				);
			} catch (e) {
				if (reminder.attempted > 5) {
					reminder.repeating = false;
					console.error(
						`I couldn't send a reminder to user ${reminder.owner} after 5 attempts, as such the reminder was deleted.\n${e.message}`,
					);
				} else {
					reminder.attempted = (reminder.attempted || 0) + 1;
					await this.collection.updateOne(
						{ _id: reminder._id },
						{ $set: { attempted: reminder.attempted } },
					);
					return;
				}
			}

			if (!reminder.repeating)
				await this.remove(reminder.owner, reminder._id.toString());
			else
				await this.collection.updateOne(
					{ _id: reminder._id },
					{
						$set: {
							time:
								reminder.time + (reminder.repeating as number),
							attempted: 0,
						},
					},
				);
		}
	};

	generateContextMenu = (): Discord.ApplicationCommandData[] => {
		return [
			{
				name: "Note this",
				type: "MESSAGE",
			},
		];
	};

	handleContextMenu = async (interaction: Discord.ContextMenuInteraction) => {
		var message = interaction.options.getMessage(
			"message",
		) as Discord.Message; //dumb api lol
		var user = interaction.user;

		await this.addNote({
			owner: user.id,
			name: message.content,
			url: message.url,
			setTime: message.createdTimestamp,
			tag: "note",
			description: null,
		});

		return await interaction.reply({
			content:
				"I added this message to your notes! use `list note` to view them!",
			ephemeral: true,
		});
	};

	generateRepeatButtons = (): Discord.MessageActionRow => {
		return new Discord.MessageActionRow().addComponents(
			new Discord.MessageSelectMenu()
				.setCustomId("timeSelect")
				.setPlaceholder("Resend reminder in...")
				.setMaxValues(1)
				.setMinValues(1)
				.addOptions([
					{
						label: "Use previous time",
						description:
							"Uses time you provided when creating the reminder.",
						value: "0",
					},
					...Object.keys(this.timeOptions).map((x, i) => ({
						label: x,
						value: (i + 1).toString(),
					})),
				]),
		);
	};

	generateRemoveButton = (): Discord.MessageActionRow => {
		return new Discord.MessageActionRow().addComponents(
			new Discord.MessageButton()
				.setStyle("DANGER")
				.setLabel("Remove")
				.setCustomId("remove"),
		);
	};

	handleButtons = async (interaction: Discord.Interaction) => {
		const user = interaction.user;

		if (
			interaction instanceof Discord.SelectMenuInteraction &&
			interaction.customId === "timeSelect"
		) {
			var list = this.deleteCache[user.id];
			if (!list) throw new Error("you have no recently sent reminders");
			var reminder = Object.values(list).find((x) => {
				return x?.msgAwaitReaction === interaction.message.id;
			});
			if (!reminder)
				throw new Error("no reminder is attached to this message");
			if (reminder.owner !== user.id)
				throw new Error(
					"you do not own the reminder attached this message",
				);

			var time: number;
			if (interaction.values[0] === "0")
				time = reminder.time - reminder.setTime;
			else
				time = Object.values(this.timeOptions)[
					parseInt(interaction.values[0]) - 1
				]();

			const created = await this.reinstate(
				reminder.owner,
				reminder._id.toString(),
				time,
			);

			await interaction.reply({
				content: `<@${created.owner}>`,
				embeds: [
					{
						title: "Reminder repeated",
						description: created.name,
						timestamp: created.time,
						url: created.url,
						color: 0x00ff00,
					},
				],
			});

			delete this.deleteCache[user.id][reminder._id.toString()];
		} else if (
			interaction instanceof Discord.ButtonInteraction &&
			interaction.customId === "remove"
		) {
			const reminder = (await this.collection.findOne({
				owner: user.id,
				msgAwaitReaction: interaction.message.id,
			})) as Types.Reminder;
			if (!reminder) throw "bad";

			if (reminder.owner !== user.id) throw "bad"; // what the fuck

			await this.remove(reminder.owner, reminder._id.toString());
			await interaction.reply(
				"Reminder removed. Use `restore` to restore it.",
			);
		}
	};

	add = async (data: Partial<Types.Reminder>) => {
		var reminder = {
			_id: null,
			owner: data.owner,
			name: data.name.split("`").join("'"),
			description: data.description
				? data.description.split("`").join("'")
				: null,
			time: data.setTime + data.time,
			channel: data.channel,
			repeating: data.repeating ? data.time : null,
			setTime: data.setTime,
			url: data.url,
			tag: data.tag,
		};

		var res = await this.collection.insertOne(reminder);
		reminder._id = res.insertedId.toString();
		return reminder;
	};

	addNote = async (data: Partial<Types.Note>) => {
		var note = {
			owner: data.owner,
			name: data.name.split("`").join("'"),
			url: data.url,
			setTime: data.setTime ? data.setTime : Date.now(),
			description: data.description
				? data.description.split("`").join("'")
				: null,
			tag: "note",
		};

		// @ts-ignore todo: whatever
		var res = await this.collection.insertOne(note);
		return note;
	};

	rename = async (
		user: string,
		id: string | Mongodb.ObjectId,
		newName: string,
	) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { name: newName } },
		);
	};

	setDescription = async (
		user: string,
		id: string | Mongodb.ObjectId,
		description: string,
	) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { description: description } },
		);
	};

	setTag = async (
		user: string,
		id: string | Mongodb.ObjectId,
		tag: string,
	) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { tag: tag } },
		);
	};

	setTime = async (
		user: string,
		id: string | Mongodb.ObjectId,
		seconds: number,
		offset: number,
	) => {
		if (!offset) offset = Date.now();
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{
				$set: {
					time: offset + seconds,
					setTime: offset,
				},
			},
		);
	};

	getAll = async (user: string): Promise<Types.Reminder[]> => {
		var cursor = await this.collection.find({ owner: user });
		var reminders = (await cursor.toArray()) as Types.Reminder[];
		return reminders.map((x, i) => ({ ...x, remove_id: i }));
	};

	reinstate = async (
		user: string,
		id: string | Mongodb.ObjectId,
		time: number,
		offset?: number,
	) => {
		offset = offset || Date.now();
		var reminder = this.deleteCache[user][id.toString()];
		reminder.repeating = false;
		reminder.time = time;
		reminder.setTime = offset;
		delete this.deleteCache[user][id.toString()];
		return await this.add(reminder);
	};

	remove = async (user: string, id: string | Mongodb.ObjectId) => {
		if (!this.deleteCache[user]) this.deleteCache[user] = {};
		const reminder = (await this.collection.findOne({
			_id: new Mongodb.ObjectId(id),
			owner: user,
		})) as Types.Reminder;
		if (!reminder) return undefined;
		this.deleteCache[user][id.toString()] = reminder;
		if (Object.keys(this.deleteCache[user]).length > 10) {
			// remove the oldest one
			// this code sucks but hey, its midnight, don't care.
			var sorted = Object.values(this.deleteCache[user]).sort(
				(a: Types.Reminder, b: Types.Reminder) =>
					a.time > b.time ? 1 : b.time > a.time ? -1 : 0,
			);
			delete this.deleteCache[user][sorted.reverse()[0]._id.toString()];
		}
		return await this.collection.deleteOne({
			_id: new Mongodb.ObjectId(id),
			owner: user,
		});
	};

	getRecentlyDeleted = (user: string) => {
		return (
			Object.values(this.deleteCache[user])?.sort(
				(a: Types.Reminder, b: Types.Reminder) =>
					a.time > b.time ? 1 : b.time > a.time ? -1 : 0,
			) || []
		);
	};

	prettyPrint = (
		reminder: Types.Reminder | Types.Note,
	): Discord.MessageOptions => {
		if (reminder.description) {
			return {
				embeds: [
					{
						title: reminder.name,
						description: `\`${reminder.description}\`\n${
							"repeating" in reminder &&
							!isNaN(reminder.repeating as number) &&
							reminder.repeating != null
								? `**Repeating every ${prettyMilliseconds(
										reminder.time - reminder.setTime,
										{ verbose: true },
								  )}**`
								: ""
						}`,
						timestamp: "time" in reminder ? reminder.time : null,
						url: reminder.url,
						color: 0x00ff00,
						footer: {
							text: reminder.tag,
						},
					},
				],
			};
		}

		return {
			embeds: [
				{
					title: "Reminder",
					description: `\`${reminder.name}\`\n${
						"repeating" in reminder &&
						!isNaN(reminder.repeating as number) &&
						reminder.repeating != null
							? `**Repeating every ${prettyMilliseconds(
									reminder.time - reminder.setTime,
									{ verbose: true },
							  )}**`
							: ""
					}`,
					timestamp: "time" in reminder ? reminder.time : null,
					url: reminder.url,
					color: 0x00ff00,
					footer: {
						text: reminder.tag,
					},
				},
			],
		};
	};
}

export default new Reminders();
