import * as Discord from 'discord.js';
import { MongoClient, Db, ObjectId } from 'mongodb';

import Reminders from 'libraries/reminders';

export interface CommandContext {
	msg: Discord.Message,
	args: string[],
	guild?: Guild,
	user: User,
	Env: Environment,
	Libs: Environment["libs"]
}

export interface Command {
	name: string,
	usage: string,
	owner?: boolean,
	exec(context: CommandContext): Object | Promise<Object>,
}

export interface Library {
	name: string,
	timeout?: number,
	exec?(Env: Environment, client: Discord.Client): Promise<any> | any,
	interval?(Env: Environment, client: Discord.Client): Promise<number | void> | number | void,
}

export interface Environment {
	ready: boolean,
	defaultAliases: { [key: string]: string },
	mongo: MongoClient,
	db?: Db,
	commands?: { [key: string]: Command },
	libs?: {
		reminders?: typeof Reminders,
		[key: string]: Library,
	}
}

export interface User {
	_id: string,
	username: string,
	prefix: string,
	alias: { [key: string]: string },
	timezone: string,
	locale: string,
}

export interface Guild {
	_id: ObjectId | string,
	prefix: string,
}

export interface Reminder {
	_id?: string,
	owner: string,
	name: string,
	time: number,
	channel: string,
	repeating: boolean | number,
	setTime: number,
	url: string,
	description?: string,
	msgAwaitReaction?: string,
	tag?: string | "note",
	remove_id?: number,
}

export interface Note {
	_id?: string,
	owner: string,
	name: string,
	description?: string,
	url: string,
	tag: string | "note",
	remove_id?: number,
}