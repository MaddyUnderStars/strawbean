import prettyMilliseconds from 'pretty-ms'

import * as Mongodb from 'mongodb';
import * as Types from '../types';
import * as Discord from 'discord.js'

class Reminders implements Types.Library {
	name = "reminders";
	timeout = 5 * 1000;	//5 seconds

	collection: Mongodb.Collection = null;
	adminDb: Mongodb.Admin = null;
	deleteCache: {
		[key: string]: {
			[key: string]: Types.Reminder
		}
	} = {};

	timeOptions = {
		"30 minutes": 30 * 60 * 1000,		//30 minutes
		"1 hour": 60 * 60 * 1000,			//60 minutes,
		"2 hours": 2 * 60 * 60 * 1000,		//2 hours
		"6 hours": 6 * 60 * 60 * 1000,		//6 hours
		"12 hours": 12 * 60 * 60 * 1000,	//12 hours
		"24 hours": 24 * 60 * 60 * 1000,	//24 hours
		"1 week": 7 * 24 * 60 * 60 * 1000,	//1 week
	}

	exec = (Env: Types.Environment, client: Discord.Client) => {
		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isButton() && !interaction.isSelectMenu()) return;

			if (interaction.user.bot) return;
			if (interaction.user.partial) await interaction.user.fetch();

			try {
				await this.handleButtons(interaction);
			}
			catch (e) {
				return await interaction.reply("Sorry, this reminder isn't for you ( and it if was, its stale. you'll have to make a new one )");
			}
		});

		this.collection = Env.db.collection("reminders");
		this.adminDb = Env.db.admin();
	}

	interval = async (Env: Types.Environment, client: Discord.Client) => {
		try {
			if (!(await this.adminDb.ping()))
				return console.error("Mongo isn't connected. I wont attempt to send reminders to prevent errors.");
		}
		catch (e) {
			//yeah I know, dupe code. but honestly the ping function shouldn't throw it should just return false if not connected
			console.error("Mongo isn't connected. I wont attempt to send reminders to prevent errors.");
			return;
		}

		var reminders = this.collection.find({ time: { $lt: Date.now() } });
		if ((await reminders.count() === 0)) return;

		while (await reminders.hasNext()) {
			const reminder = await reminders.next() as Types.Reminder;

			var channel: Discord.TextChannel | Discord.DMChannel = null;

			//Notes don't normally have times, and so this was once a reminder with a time that had its tag set to note
			if (reminder.tag === "note")
				return;

			//hmm large try catch, whatever
			try {
				if (reminder.channel)
					channel = await client.channels.fetch(reminder.channel) as Discord.TextChannel;

				var user: Discord.User = await client.users.fetch(reminder.owner);
				if (!channel) channel = await user.createDM() as Discord.DMChannel;

				// //this is TERRIBLE. TODO: Put 'remove_id' in the db, rather than generating it on the fly.
				// var remove_id = (await me.getAll(user.id)).find(x => x._id.toString() === reminder._id.toString()).remove_id + 1;

				var short = reminder.name.length > 50 ? reminder.name.substring(0, 51) + " ..." : reminder.name;

				var embed = new Discord.MessageEmbed({
					title: !reminder.description ? `Reminder` : reminder.name,
					description: !reminder.description ? reminder.name : "`" + reminder.description + "`",
					timestamp: reminder.setTime,
					url: reminder.url,
					footer: {
						text: `Created ${channel instanceof Discord.TextChannel ? `in ${channel.name} : ${channel.guild.name}` : `in DM`}`
					},
					color: 0x00ff00,
				});

				var msg = await channel.send({
					content: `<@${reminder.owner}> : \`${short}\``,
					embeds: [embed],
					components: [reminder.repeating ? this.generateRemoveButton() : this.generateRepeatButtons()],
				})

				await this.collection.updateOne({ _id: reminder._id }, { $set: { msgAwaitReaction: msg.id } })
			}
			catch (e) {
				reminder.repeating = false;

				console.error(`I couldn't send a reminder to user ${reminder.owner}, as such the reminder was deleted.\n${e.message}`);
			}

			if (!reminder.repeating)
				await this.remove(reminder.owner, reminder._id.toString());
			else
				await this.collection.updateOne({ _id: reminder._id }, { $set: { time: reminder.time + (reminder.repeating as number) } })
		}
	}

	generateRepeatButtons = (): Discord.MessageActionRow => {
		return new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageSelectMenu()
					.setCustomId("timeSelect")
					.setPlaceholder("Resend reminder in...")
					.setMaxValues(1)
					.setMinValues(1)
					.addOptions([
						{
							label: "Use previous time",
							description: "Uses time you provided when creating the reminder.",
							value: "0",
						},
						...Object.keys(this.timeOptions).map((x, i) => ({
							label: x,
							value: (i + 1).toString()
						})),
					])
			);
	}

	generateRemoveButton = (): Discord.MessageActionRow => {
		return new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setStyle("DANGER")
					.setLabel("Remove")
					.setCustomId("remove")
			);
	}

	handleButtons = async (interaction: Discord.Interaction) => {
		var user = interaction.user;

		if (interaction instanceof Discord.SelectMenuInteraction &&
			interaction.customId === "timeSelect") {
			var list = this.getRecentlyDeleted(user.id);
			if (!list) throw 'bad';
			var reminder = Object.values(list).find(x => {
				return x.msgAwaitReaction === interaction.message.id
			});
			if (!reminder) throw 'bad';
			if (reminder.owner !== user.id) throw 'bad';	//what

			var time: number;
			if (interaction.values[0] === "0")
				time = reminder.time - reminder.setTime;
			else
				time = Object.values(this.timeOptions)[parseInt(interaction.values[0]) - 1];

			await this.reinstate(reminder.owner, reminder._id.toString(), time);

			await interaction.reply({
				content: `<@${reminder.owner}>`, embeds: [{
					title: "Reminder repeated",
					description: reminder.name,
					timestamp: Date.now() + time,
					url: reminder.url,
					color: 0x00ff00,
				}]
			})

			delete this.deleteCache[user.id][reminder._id.toString()];
		}
		else if (interaction instanceof Discord.ButtonInteraction &&
			interaction.customId === "remove") {
			var reminder = await this.collection.findOne({ owner: user.id, msgAwaitReaction: interaction.message.id }) as Types.Reminder;
			if (!reminder) throw 'bad';

			await this.remove(reminder.owner, reminder._id.toString());
			await interaction.reply("Reminder removed. Use `restore` to restore it.");
		}
	}

	add = async (data: Types.Reminder) => {
		var reminder = {
			_id: null,
			owner: data.owner,
			name: data.name,
			description: data.description,
			time: data.setTime + data.time,
			channel: data.channel,
			repeating: data.repeating ? data.time : null,
			setTime: data.setTime,
			url: data.url,
			tag: data.tag,
		}

		var res = await this.collection.insertOne(reminder);
		reminder._id = res.insertedId.toString();
		return reminder;
	}

	addNote = async (data: { owner: string, name: string, url: string, description: string }) => {
		var note = {
			owner: data.owner,
			name: data.name,
			url: data.url,
			setTime: Date.now(),
			description: data.description,
			tag: "note",
		}

		var res = await this.collection.insertOne(note);
		return note;
	}

	rename = async (user: string, id: string, newName: string) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { name: newName } }
		);
	}

	setDescription = async (user: string, id: string, description: string) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { description: description } }
		);
	}

	setTag = async (user: string, id: string, tag: string) => {
		return await this.collection.updateOne(
			{ _id: id, owner: user },
			{ $set: { tag: tag } }
		);
	}

	getAll = async (user: string): Promise<Types.Reminder[]> => {
		var cursor = await this.collection.find({ owner: user });
		var reminders = (await cursor.toArray()) as Types.Reminder[];
		return reminders.map((x, i) => ({ ...x, remove_id: i }));
	}

	reinstate = async (user: string, id: string, time: number) => {
		var reminder = this.deleteCache[user][id];
		reminder.repeating = false;
		reminder.time = time;
		reminder.setTime = Date.now();
		delete this.deleteCache[user][id];
		return await this.add(reminder);
	}

	remove = async (user: string, id: string) => {
		if (!this.deleteCache[user]) this.deleteCache[user] = {};
		this.deleteCache[user][id.toString()] = await this.collection.findOne({ _id: new Mongodb.ObjectId(id), owner: user }) as Types.Reminder;
		return await this.collection.deleteOne({ _id: new Mongodb.ObjectId(id), owner: user });
	}

	getRecentlyDeleted = (user: string) => {
		return this.deleteCache[user];
	}

	prettyPrint = (reminder: Types.Reminder | Types.Note): Discord.MessageEditOptions => {
		if (reminder.description) {
			return {
				embeds: [{
					title: reminder.name,
					description: `\`${reminder.description}\`\n${'repeating' in reminder && isNaN(reminder.repeating as number) ?
						`**Repeating every ${prettyMilliseconds(reminder.time - reminder.setTime, { verbose: true })}**` :
						""}`,
					timestamp: 'time' in reminder ? reminder.time : null,
					url: reminder.url,
					color: 0x00ff00,
					footer: {
						text: reminder.tag
					},
				}]
			}
		}

		return {
			embeds: [{
				title: "Reminder",
				description: `\`${reminder.name}\`\n${'repeating' in reminder && isNaN(reminder.repeating as number) ?
					`**Repeating every ${prettyMilliseconds(reminder.time - reminder.setTime, { verbose: true })}**` :
					""}`,
				timestamp: 'time' in reminder ? reminder.time : null,
				url: reminder.url,
				color: 0x00ff00,
				footer: {
					text: reminder.tag
				},
			}]
		}
	}
}

export default new Reminders();