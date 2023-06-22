import * as Discord from "discord.js";
import { MongoClient, Db, ObjectId, WithId, Document } from "mongodb";

import Reminders from "libraries/reminders";
import Language from "libraries/language";

export interface CommandContext {
	msg: Discord.Message;
	args: string[];
	guild?: Guild;
	user: User;
	Env: Environment;
	Libs: Environment["libs"];
}

export interface CommandReturnValue {
	reply?: string | Discord.MessagePayload | Discord.ReplyMessageOptions;
}

type CommandReturnValueOrVoid = CommandReturnValue | void;

export interface Command {
	name: string;
	usage: string;
	owner?: boolean;
	commandChainingLimit?: number;
	help: string;
	examples?: string[];
	exec(
		context: CommandContext,
	): CommandReturnValueOrVoid | Promise<CommandReturnValueOrVoid>;
}

export interface Library {
	name: string;
	timeout?: number;
	exec?(Env: Environment, client: Discord.Client): Promise<any> | any;
	interval?(
		Env: Environment,
		client: Discord.Client,
	): Promise<number | void> | number | void;
}

export interface Environment {
	ready: boolean;
	client: Discord.Client;
	defaultAliases: { [key: string]: string };
	mongo: MongoClient;
	db?: Db;
	commands?: { [key: string]: Command };
	libs?: {
		reminders?: typeof Reminders;
		language?: typeof Language;
		[key: string]: Library;
	};
}

export interface User {
	_id: string;
	username: string;
	prefix: string;
	alias: { [key: string]: string };
	timezone: string;
	locale: string;
	defaultTime: string | null;
	calendarToken?: string;

	socialCredit?: number;
}

export interface Guild {
	_id: ObjectId | string;
	prefix: string;
}

export interface Reminder extends WithId<Document> {
	owner: string;
	name: string;
	time: number;
	channel: string;
	repeating: boolean | number;
	setTime: number;
	url: string;
	description?: string;
	msgAwaitReaction?: string;
	tag?: string | "note";
	remove_id?: number;
	attempted?: number; //number of times a DM reminder has been attempted and failed
}

export interface Note {
	_id?: string;
	owner: string;
	name: string;
	description?: string;
	url: string;
	tag?: "note";
	setTime?: number;
	remove_id?: number;
}
