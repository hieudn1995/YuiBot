const request = require('request');
const discord = require('discord.js');
const ggtrans = require('google-translate-api');

const tenor_key = process.env.TENOR_KEY;
const anon_id = process.env.ANON_ID;

var boundTextChannel = undefined;
var boundVoiceChannel = undefined;
const colorCodeYui = 'FFA000';

function resetStatus() {
    boundTextChannel = undefined;
    boundVoiceChannel = undefined;
}

function isBound() {
    return (boundVoiceChannel !== undefined);
}

function leaveVC(member) {
    boundTextChannel.send("*There's no one around so I'll leave too. Bye~!*");
    resetStatus();
    return member.voiceChannel.leave();
}

function checkOnLeave(oldMem, newMem) {
    if (isBound()) {
        let oldStat = oldMem.voiceChannel;
        let newStat = newMem.voiceChannel;
        if (newStat === boundVoiceChannel) {
            return 'clear';
        } else
        if (!oldStat || oldStat !== boundVoiceChannel) {
            return 'ignore';
        } else
        if (!newStat || newStat !== boundVoiceChannel) {
            return 'leave'
        }
    }
}

function checkBoundChannel(message, join) {
    if (message.member.voiceChannel) {
        if (!boundVoiceChannel && join) {
            boundVoiceChannel = message.member.voiceChannel;
            boundTextChannel = message.channel;
            message.channel.send("Bound to Text Channel: **`" + boundTextChannel.name + "`** and Voice Channel: **`" + boundVoiceChannel.name + "`**!");
            return true;
        } else {
            if (message.channel === boundTextChannel && message.member.voiceChannel === boundVoiceChannel) {
                return true;
            } else {
                if (boundVoiceChannel) {
                    message.reply("I'm playing at **`" + boundTextChannel.name + "`** -- **`" + boundVoiceChannel.name + "`**");
                } else {
                    message.reply("I'm not in any voice channel.");
                }
                return false;
            }
        }
    } else {
        message.reply("*please join a __Voice Channel__!*");
    }
}
async function tenor_gif(query, message, bot) {
    message.delete().then(async message => {
        let num = await RNG(5);
        let mention_user;
        let des;
        if (message.mentions.users.first()) {
            mention_user = query.pop();
            query = query.join(" ");
            des = message.author.toString() + " " + query.toUpperCase() + " " + mention_user;
        } else {
            query = query.join(" ");
            des = message.author.toString() + " " + query.toUpperCase();
        }
        request('https://api.tenor.com/v1/search?q=anime ' + query + '&key=' + tenor_key + '&limit=5&media_filter=basic&anon_id=' + anon_id,
            function (err, respond, body) {
                if (err) return console.error(err);
                var json = JSON.parse(body);
                if (json.error) return console.error(json.error);
                message.channel.send({
                    embed: new discord.RichEmbed()
                        .setImage(json.results[num].media[0].gif.url)
                        .setColor(colorCodeYui)
                        .setDescription(des)
                });
            });
    });
}

function RNG(range) {
    return new Promise(resolve => {
        resolve(Math.floor(Math.random() * range));
    });
}

function translate(args, message, bot) {
    return message.channel.send("Currently unavailable. Gomennasai desu :(. Polaris is working  on it.");
//     if (args[0] === 'code') {
//         message.author.send("Here're the language codes required for translation", {
//             embed: new discord.RichEmbed()
//                 .setAuthor('Language codes request', bot.user.avatarURL)
//                 .setColor(colorCodeYui)
//                 .setURL('https://cdn.discordapp.com/attachments/413313406993694728/456677126821773319/langcode.txt')
//                 .setTitle('Language Codes (.txt file)')
//                 .setDescription('To translate: type >translate <source language> <destination language> <your words(limit: 1000 words)>')
//         });
//     } else if (args.length < 3) {
//         return message.channel.send("Wrong format, use `>translate auto <destination language> <words>` or type `>translate code` for more information.");
//     } else {
//         let scr = args.shift();
//         let des = args.shift();
//         let query = args.join(" ");
//         googleTranslate(query, scr, des, message);
//     }
}

function googleTranslate(query, src_lang, des_lang, message) {
    ggtrans(query, {
        from: src_lang,
        to: des_lang
    }).then(res => {
        message.channel.send({
            embed: new discord.RichEmbed()
                .setColor(colorCodeYui)
                .setDescription(res.text)
        });
    }).catch(err => {
        message.channel.send('Error. Translation failed!');
        return console.error(err);
    });
}

function adminCommands(message, args) {
    if (message.guild.me.hasPermission(['BAN_MEMBERS', 'KICK_MEMBERS'], true, true, true)) {
        let ad_command = args.shift().toLowerCase();
        if (ad_command === 'kick') {
            let reason = args.join(' ');
            let kickMem = message.mentions.members.first();
            kickMem.kick(reason).then((mem) => {
                message.channel.send(mem.user.username + ' has been kicked by ' + message.author.username + " for reason: " + reason);
            });
        }
        if (ad_command === 'ban') {
            let reason = args.join(' ');
            let banMem = message.mentions.members.first();
            banMem.ban(reason).then((mem) => {
                message.channel.send(mem.user.username + ' has been banned by ' + message.author.username + " for reason: " + reason);
            });
        }
    } else {
        return message.author.send("you don't have the required permissions to perform this action.");
    }
}

function getPing(message, bot) {
    let timestamp = message.createdTimestamp;
    message.channel.send('Pinging...').then((message) => {
        let diff = (Date.now() - timestamp) * 2;
        //var t = '**```💻 ⇄ 🖥: ' + diff + 'ms```\n```🌸 ⇄ 🖥: ' + bot.pings[0] + 'ms```**';
        message.edit({
            embed: new discord.RichEmbed()
                .setColor(colorCodeYui)
                .setDescription('**```💻 ⇄ 🌸: ' + diff + 'ms```\n```🌸 ⇄ 🖥: ' + bot.pings[0] + 'ms```**')
        });
    });
}

function say(args, message) {
    if (message.member.hasPermission("BAN_MEMBERS", true, true, true)) {
        args = args.join(" ");
        message.delete().then(message => {
            message.channel.send({
                embed: new discord.RichEmbed()
                    .setColor(colorCodeYui)
                    .setDescription(args)
            });
        });
    } else {
        message.delete().then(message => {
            message.author.send('sorry but i will only speak for my Master.');
        });
    }

}

function help(message, bot) {
    message.author.send("Here's my commands and info", {
        embed: new discord.RichEmbed()
            .setAuthor('Yui-chan', bot.user.avatarURL)
            .setColor(colorCodeYui)
            .setURL('https://cdn.discordapp.com/attachments/413313406993694728/463714313719513088/commandlist.txt')
            .setTitle("Yui's command list, just a .txt file")
            .setDescription("OHTSUKI YUI from THE IDOLM@STER CINDERELLA GIRLS: STARLIGHT STAGE. Yoroshiku nee~!!! XD")
    });
}

module.exports = {
    tenorGIF: tenor_gif,
    adminCommands: adminCommands,
    checkChannel: checkBoundChannel,
    resetStatus: resetStatus,
    checkOnLeave: checkOnLeave,
    leaveVC: leaveVC,
    getPing: getPing,
    translate: translate,
    say: say,
    help: help,
}
