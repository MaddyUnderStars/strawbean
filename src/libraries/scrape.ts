import * as Types from "../types";
import * as Discord from 'discord.js'
import * as Mongodb from 'mongodb';

import crypto from "crypto";

import fetch from 'node-fetch';

interface ScrapeUrl {
	_id?: Mongodb.ObjectId,
	url: string;
	owners: string[];
	previousHash?: string;
	lastChecked?: number;
	name: string;
}

class Scrape implements Types.Library {
	name = "scrape";
	timeout = 12 * 60 * 60 * 1000;	//12 hours

	collection: Mongodb.Collection = null;

	exec = async (Env: Types.Environment, client: Discord.Client) => {
		this.collection = Env.db.collection("scrape");
	}

	interval = async (Env: Types.Environment, client: Discord.Client) => {
		const urls = this.collection.find({});
		if (await urls.count() === 0) return;

		while (await urls.hasNext()) {
			const url = await urls.next() as ScrapeUrl;

			if (url.lastChecked + 12 * 60 * 60 * 1000 > Date.now()) continue;

			try {
				var resp = await fetch(url.url);
			}
			catch (e) {
				continue;
			}
			if (!resp.ok) continue;

			const hash = this.generateHash(await resp.text());

			if (url.previousHash !== hash) {
				for (var id of url.owners) {
					const user: Discord.User = await client.users.fetch(id);
					const channel = await user.createDM();
					if (!channel) continue;

					await channel.send({
						embeds: [{
							title: url.name,
							description: "There was an update with this webpage.",
							timestamp: Date.now(),
							url: url.url,
							color: 0x00ff00,
						}]
					})
				}
			}

			url.previousHash = hash;
			url.lastChecked = Date.now();

			await this.collection.updateOne({ _id: url._id }, { $set: url })
		}
	}

	generateHash = (input: string) => {
		return crypto.createHash("md5").update(input).digest("hex").toString();
	}

	add = async (url: ScrapeUrl) => {
		const existing = await this.collection.findOne({ url: url.url }) as ScrapeUrl;
		if (existing) {
			if (!existing.owners.includes(url.owners[0]))
				existing.owners.push(url.owners[0]);

			await this.collection.updateOne({ _id: existing._id }, { $set: existing });
		}
		else {
			await this.collection.insertOne(url);
		}
	}

	remove = async (url: string, user: string) => {
		const found = await this.collection.findOne({ url: url, owners: [user] }) as ScrapeUrl;
		found.owners.splice(found.owners.indexOf(user), 1);

		if (!found.owners.length)
			await this.collection.deleteOne({ _id: found._id });
		else
			await this.collection.updateOne({ _id: found._id }, { $set: found });
	}

	getAll = async (user: string): Promise<ScrapeUrl[]> => {
		return await (await this.collection.find({ owners: [user] })).toArray() as ScrapeUrl[];
	}
}

export default new Scrape();