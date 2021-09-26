import * as Types from "../types"

export default new (class fuck implements Types.Command {
	name = "fuck";
	usage = "{@Ping} [@Ping]";

	singlePartner = async (msg, target, preaccepted = false) => {
		var askMessages = [
			`Hey <@${target.id}>! <@${msg.author.id}> told me to tell you that they think you're cool! And that they would like to have the hot sex with you. Only if you want though.`,
			`<@${target.id}>, <@${msg.author.id}> would like you to 'hang out' at their house for a bit. Do you want to come over?`,
			`<@${msg.author.id}>: "I gotta bucket of chicken, you gotta bucket of chicken. Wanna do it, <@${target.id}>?"`,
			`<@${msg.author.id}> really likes your outfit! They would also really like to bring you to their house. Do you accept, <@${target.id}>?`,
			`<@${msg.author.id}> tugs on <@${target.id}>'s shoulder. They look really nervous. They ask if you could stay the night with them.`,
			`<@${msg.author.id}> *looks* like a top, but is it all just a facade? Would you like to find out, <@${target.id}>?`,
			`Hang on, <@${target.id}>! I found this letter from <@${msg.author.id}> and, spoiler, it says they're uncontrollably horny! Want to relieve that sexual tension for them?`,
			`<@${msg.author.id}> runs up to you as you're about to leave. They're stumbling over their words but manage to muster the courage to ask you to come home with them. What do you think, <@${target.id}>?`,
			`<@${msg.author.id}> : do you want to have the fuck, <@${target.id}>?`
		]

		if (!preaccepted) {
			var myMsg = await msg.channel.send(askMessages[Math.floor(Math.random() * askMessages.length)]);
			myMsg.react("✅");
			myMsg.react("❎");
			myMsg.react("⛔");

			var reactions = await myMsg.awaitReactions((reaction, user) => {
				if (user.id !== target.id) return false;
				if (reaction.emoji.name !== "✅" &&   //yes
					reaction.emoji.name !== "❎" &&   //no
					reaction.emoji.name !== "⛔")     //no entry
					return false;

				return true;
			}, { max: 1 })

			var reaction = reactions.array()[0];
		}

		var messages;

		//terrible solution, whatever
		if (preaccepted || reaction.emoji.name === "✅") {   //yes
			messages = [
				`You fuck <@${target.id}> super cute and stuff`,
				`Surprise! You're actually a bottom and <@${target.id}> thinks your cute!`,
				`You top <@${target.id}> like a champ!`,
				`Whoops! You and <@${target.id}> are both bottoms! You just sat there holding hands.`,
				`<@${target.id}> loved every second!`,
				`<@${target.id}> was left unsatisfied... Maybe more foreplay?`,
				`<@${target.id}> brang some toys! I wonder who topped?`,
				`You brang some toys and <@${target.id}> was left shaking!`,
				`You were left shaking by <@${target.id}>!`,
				`<@${target.id}> was amazing! Like your entire body was on fire!`,
				`Your orgasms never lasted this long before! <@${target.id}> was amazing!`,
				`<@${target.id}> was left speechless!`,
				`After a while you just started cuddling <@${target.id}>, cute.`
			]
		}
		else if (reaction.emoji.name === "❎") { //no
			messages = [
				`<@${target.id}> wasn't really in the mood so you went out and got ice cream instead!`,
				`<@${target.id}> isn't ready for that yet, better luck next time!`,
				`I hope you had other plans because <@${target.id}> isn't in the mood`,
				`:( Sorry bud, I'm sure <@${target.id}> will be up for it later!`,
				`Maybe next time? I'm sure your feelings will reach <@${target.id}> soon!`,
			]
		}
		else if (reaction.emoji.name === "⛔") { //yikes
			messages = [
				`Sorry bro, <@${target.id}> just wasn't that into you.`,
				`Not too sure myself but it didn't seem like <@${target.id}> liked you...`,
				`Maybe you'll have better luck with someone other than <@${target.id}>...`,
				`You should try becoming better friends with <@${target.id}> before you ask them!`,
				`Not sure what went wrong there, maybe you should practice kissing the mirror before you try <@${target.id}>`,
				`<@${target.id}> hated your advances. Yikes.`,
			]
		}

		messages = messages.sort(() => 0.5 - Math.random())
		await msg.reply(messages[Math.floor(Math.random() * messages.length)])
	}

	threesome = async (msg, targets) => {
		var askMessages = [
			`Hey <@${targets[0].id}> and <@${targets[1].id}>! <@${msg.author.id}> would like to have some fun. Want to come along?`,
			`<@${targets[0].id}> and <@${targets[1].id}> were hanging out when suddenly, <@${msg.author.id}> appears! They ask if they want to 'play' at their house. What do you think?`,
			`<@${msg.author.id}> comes up to <@${targets[0].id}> and <@${targets[1].id}>, visibly horny. Do you want to help solve this for them?`,
			`<@${msg.author.id}> looks like a top, but can they really handle both <@${targets[0].id}> and <@${targets[1].id}>?`,
			`It looks like something is bothering <@${msg.author.id}>, they wont stop shaking. As <@${targets[0].id}> goes to ask what's wrong, <@${msg.author.id}> invites <@${targets[0].id}> and <@${targets[1].id}> to a threesome! What a twist!`,
			`<@${msg.author.id}> looks like the type of person who you can easily 'break'. Would you like to find out, <@${targets[0].id}>, <@${targets[1].id}>?`,
			`Whats up, <@${targets[0].id}>, <@${targets[1].id}>? I hope you didn't have anything planned in the next 2 hours because <@${msg.author.id}> has invited you to a threesome!`,
			`<@${targets[0].id}>, <@${targets[1].id}>, and <@${msg.author.id}>. Bedroom. Right now. Do you accept?`,
			`<@${msg.author.id}> seems really horny. They're trying to hide it but, honestly its not working. Would either of you like to help them? <@${targets[0].id}>? <@${targets[1].id}>?`
		].sort(() => 0.5 - Math.random())

		var myMsg = await msg.channel.send(askMessages[Math.floor(Math.random() * askMessages.length)]);
		myMsg.react("✅");
		myMsg.react("❎");
		myMsg.react("⛔");

		var consented = [];
		var reactions = await myMsg.awaitReactions((reaction, user) => {
			if (consented.indexOf(user.id) !== -1) return false;
			if (targets.map(x => x.id).indexOf(user.id) === -1) return false;
			if (reaction.emoji.name !== "✅" &&   //yes
				reaction.emoji.name !== "❎" &&   //no
				reaction.emoji.name !== "⛔")     //no entry
				return false;

			consented.push(user.id);
			return true;
		}, { max: 2 })

		var badReact = reactions.filter(x => {
			return x.emoji.name !== "✅"
		});
		var oneDecline = badReact ? badReact.array().filter(x => x.count === 2) : false;
		if (badReact && oneDecline && oneDecline.length === 1) { //includes bot
			var who = oneDecline[0].users.array().find(x => x.bot === false)  //lol
			await msg.channel.send(`<@${who.id}> didn't feel like joining so...`);
			return await this.singlePartner(msg, targets.find(x => x.id !== who.id), true)
		}
		else if (badReact.size !== 0) {
			var people = targets.map(x => `<@${x.id}>`).sort(() => .5 - Math.random())

			var ewMessages = [
				`Both ${people[0]} and ${people[1]} were visibly disgusted by the suggestion.`,
				`${people[0]} and ${people[1]} said they'd rather not and left. You should probably respect that.`,
				`Maybe ${people[0]} and ${people[1]} don't like eachother? You could try asking them separately?`,
				`Yikes! ${people[0]} slapped you in the face as they walked away! ${people[1]} followed suit.`,
				`Maybe you should get more experience before asking ${people[0]} and ${people[1]} to a threesome?`,
				`You should try asking people you're closer with, rather than ${people[0]} and ${people[1]}`,
				`Do you even know ${people[0]} and ${people[1]}? Getting to know them properly might give better results.`,
			].sort(() => 0.5 - Math.random())

			var thanksButNoMessages = [
				`Neither ${people[0]} or ${people[1]} were really in the mood. You decided to hang out at karaoke instead!`,
				`${people[0]} and ${people[1]} weren't really into it today. Instead, you had a nice walk on the beach together!`,
				`${people[0]} had other plans for day and ${people[1]} wasn't ready for it yet. You decided to have ice cream together instead!`,
				`${people[0]} and ${people[1]} want to have a better relationship before doing something like this. Better luck next time!`,
				`${people[0]} and ${people[1]} were too nervous and ( very obviously ) lied about having other plans. Boo!`,
				`${people[0]} was noticeably more into it than ${people[1]}, but they both declined.`,
				`Maybe you should work on your approach more. "I gotta bucket of chicken" doesn't really cut it for ${people[0]} and ${people[1]}`,
				`:( Damn, maybe you should get to know ${people[0]} and ${people[1]} better before asking for something so intense!`,
			].sort(() => 0.5 - Math.random())

			var bothDecline = badReact.array().find(x => x.count === 3);
			if (bothDecline) {
				//both declined same option
				if (bothDecline.emoji.name === "⛔") {
					return await msg.channel.send(ewMessages[Math.floor(Math.random() * ewMessages.length)])
				}
				else if (bothDecline.emoji.name === "❎") {

					return await msg.channel.send(thanksButNoMessages[Math.floor(Math.random() * thanksButNoMessages.length)]);
				}
			}

			return await msg.channel.send(thanksButNoMessages[Math.floor(Math.random() * thanksButNoMessages.length)])
		}

		var people = (targets.concat(msg.author)).sort(() => .5 - Math.random())    //shuffle the targets
		people = people.map(x => `<@${x.id}>`)  //don't want to keep typing <@${people[0].id}> constantly like I did previously :/
		var goodEndings = [
			`Aw, ${people[0]} was mostly left out while ${people[1]} and ${people[2]} went at it! ( ${people[1]} was the bottom! )`,
			`${people[0]} was sandwiched inbetween ${people[1]} and ${people[2]}! They were practically drooling!`,
			`${people[0]} surprised the others with some toys! I don't think ${people[1]}'s legs will work for a while after ${people[0]} and ${people[2]}'s attacks!`,
			`${people[0]} rode ${people[1]} while ${people[2]} attacked their nipples!`,
			`${people[0]} was gasping for air as ${people[1]}'s thighs clenched harder. ${people[2]} was left to play with their exposed parts!`,
			`A 69 with 3 people? The moans coming from ${people[0]}, ${people[1]} and ${people[2]} as they had their lower regions played with was deafening!`,
			`${people[0]} and ${people[1]} took turns toying with ${people[2]} as ${people[2]} squirmed and shaked like crazy!`,
			`You all thought at least one of you were a top! Surprise, ${people[0]}, ${people[1]} and ${people[2]} were too nervous to advance any futher!`,
			`It was pure bliss! ${people[0]}, ${people[1]} and ${people[2]} loved every second!`,
			`Aaaahhh! ${people[0]} and ${people[1]} teamed up on ${people[2]}! They couldn't stand by the end of it!`,
			`${people[0]} was played with so much that they ended up falling over! ${people[1]} blamed ${people[2]}.`,
			`Honestly it looked more like cuddling than sex but it was cute so ${people[0]}, ${people[1]} and ${people[2]} enjoyed it.`,
		].sort(() => 0.5 - Math.random())

		return await msg.channel.send(goodEndings[Math.floor(Math.random() * goodEndings.length)])
	}

	exec = async ({ msg }: Types.CommandContext) => {
		if (!msg.guild) {
			return { reply: "unless you plan on sticking something in a disc tray I don't know how you plan on doing this." };
		}

		var targets = [];
		if (msg.mentions.members.size !== 0) {
			var user = msg.mentions.members.first();
			if (user) targets[0] = user.user;

			if (msg.mentions.members.size > 1) {  //hacky Ik but shut up I didn't ask
				var second = msg.mentions.members.values()[1];   //fuck you
				if (second && second.user.id !== targets[0].id && second.user.id !== msg.author.id)
					targets[1] = second.user;
			}
		}

		if (targets.length === 0) {
			await msg.reply("You ask the void but the void does not respond.");
			return;
		}

		if (targets[0].id === msg.author.id) {
			var messages = [
				"Well, masturbation IS pretty cool.",
				"Do what you gotta do bud",
				"Someones watching",
				"I heard masturbating reduces the risk of prostate cancer",
				"I heard masturbating stunts growth",
				"You're on the floor literally shaking what the hell maybe you don't even need a partner",
				"You shouldn't masturbate too hard, if you do it'll be hard for your partner later on",
				"You look kinda cute what the hell"
			].sort(() => 0.5 - Math.random())
			await msg.reply(messages[Math.floor(Math.random() * messages.length)])
			return
		}

		if (targets.length > 1) {
			await this.threesome(msg, targets)
		}
		else {
			await this.singlePartner(msg, targets[0]);
		}
	}
})