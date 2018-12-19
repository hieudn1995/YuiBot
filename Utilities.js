const request = require('request');
const discord = require('discord.js');
//const ggtrans = require('google-translate-api');

const tenor_key = process.env.TENOR_KEY;
const anon_id = process.env.ANON_ID;
const OwnerID = process.env.OWNER_ID;

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
            boundVoiceChannel.join();
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
async function tenor_gif(query, message) {
    message.delete().then(async message => {
        let num = await RNG(5);
        let des;
        if (message.mentions.users.first()) {
            query.splice(query.indexOf(message.mentions.users.first()), 1);
            query = query.join(" ");
            des = message.author.toString() + " " + query.toUpperCase() + " " + message.mentions.users.first();
        } else {
            query = query.join(" ");
            des = message.author.toString() + " " + query.toUpperCase();
        }
        request('https://api.tenor.com/v1/search?q=' + query + ' anime&key=' + tenor_key + '&limit=5&media_filter=basic&anon_id=' + anon_id,
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
    if (isMyOwner(message.author.id) || message.member.hasPermission(['BAN_MEMBERS', 'KICK_MEMBERS'], false, true, true)) {
        let action = args.shift().toLowerCase();
        let mem = message.mentions.members.first();
        let testFormat = args.shift();     
        if (mem && mem == testFormat) {
            let reason = args.join(" ");
            switch (action) {
                case 'kick': {
                        mem.kick(reason).then((mem) => {
                            message.channel.send('`' + mem.user.username + '` has been kicked by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to kick the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'ban': {
                        mem.ban(reason).then((mem) => {
                            message.channel.send('`' + mem.user.username + '` has been banned by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to ban the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'mute': {
                        mem.setMute(true, reason).then(() => {
                            message.channel.send('`' + mem.displayName + '` has been muted by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to mute the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'unmute': {
                        mem.setMute(false, reason).then(() => {
                            message.channel.send('`' + mem.displayName.toString() + '` has been unmuted by `' + message.member.displayName + '`');
                        }).catch(err => {
                            message.author.send("Unable to unmute the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'setnickname': {                
                    let oldname  = mem.displayName;
                    mem.setNickname(reason).then(() => {
                        message.channel.send("`" + oldname + "'s` nickname is set to `" + reason + "` by `" + message.member.displayName + "`");
                    }).catch(err => {
                        message.author.send("Unable to set nickname. I don't have enough permissions.");
                        console.log(err);
                    });
                    break;
                }
                case 'addrole': {
                        let role = getRoleId(message.guild.roles, reason);
                        if (role[0]) {
                            if (!mem.roles.has(role[0])) {
                                mem.addRole(role[0]).then(() => {
                                    message.channel.send("Added role `" + role[1] + "` to `" + mem.displayName + "` by `" + message.member.displayName + "`");
                                }).catch(err => { 
                                    message.author.send("Something went wrong. Maybe i don't have enough permission to do this. ");
                                    console.error(err);
                                });

                            } else {
                                message.author.send("the member has already had the role `" + role[1] + "`");
                            }
                        } else {
                            message.author.send("Invalid role. Please try gain.")
                        }
                        break;
                    }
                case 'removerole': {
                        let role = getRoleId(message.guild.roles, reason);
                        if (role[0]) {
                            if (mem.roles.has(role[0])) {
                                mem.removeRole(role[0]).then(() => {
                                    message.channel.send("Removed role `" + role[1] + "` from `" + mem.displayName + "` by `" + message.member.displayName + "`");
                                }).catch((err) => { 
                                    message.author.send("Something went wrong. Maybe i don't have enough permission to do this. ");
                                    console.log(err);
                                });

                            } else {
                                message.reply("the member doesn't have the role `" + role[1] + "`");
                            }
                        } else {
                            message.author.send("Invalid role. Please try gain.")
                        }
                        break;
                    }
            }
        } else {
            message.author.send("Wrong format. (`>admin <action> <@mention> <?reason>`)");
        }
    } else {
        return message.author.send("You don't have the required permissions to perform this action.");
    }
}

function getRoleId(data, search_val) {
    let id, name;
    data.map((val, key) => {
        if (val.name.toLowerCase() === search_val.toLowerCase()) {
            id = key;
            name = val.name;
        }
    });
    return [id, name];
}

function getPing(message, bot) {
    message.channel.send('Pinging...').then((sent) => {
        let diff = (sent.createdTimestamp - message.createdTimestamp);
        sent.edit({
            embed: new discord.RichEmbed()
                .setTitle('Status')
                .setColor(colorCodeYui)
                .setDescription(':revolving_hearts: **`: ' + diff + 'ms`**\n:heartpulse: **`: ' + bot.pings[0] + 'ms`**')
        });
    });
}

function say(args, message) {
    if (isMyOwner(message.author.id) || message.member.hasPermission("BAN_MEMBERS", false, true, true)) {
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

function isMyOwner(UserID)
{
    return (UserID === OwnerID);
}

function help(message, bot) {
    let commands = "**__Music:__**\n`play | p`: add to end\n" +
        "`pnext | pn`: add to next\n" +
        "`skip | next <?range>`: skip a or some song(s)\n" +
        "`leave | bye`: leave the bot\n" +
        "`join | come`: join the bot\n" +
        "`queue <?number>`: list out the queue at tab number (default 0)\n" +
        "`np | nowplaying`: currently playing song's info\n" +
        "`loop <?queue>`: loop the song/queue\n" +
        "`pause`: pause the song\n" +
        "`resume`: resume pause\n" +
        "`shuffle`: shuffle the queue\n" +
        "`clear`: clear queue\n" +
        "`search`: search for a song, pick by index\n" +
        "`autoplay | ap`: from current Youtube channel, random limit: 50 songs\n" +
        "`remove <index> <?range>`: remove a/some song(s)\n" +
        "`stop`: clear queue and stop playing\n\n" +
        "**__Ultilities:__**\n`admin <kick/ban/mute/unmute/setnickname/addrole/removerole> <@mention> <?reason>`: admin commands\n" +
        "`tenor`: tenor GIFs, random limit: 5\n" +
        "`ping`: connection's status\n" +
        "`say`(limit to admin/owner): repeat what you say\n\n";
    message.author.send({
        embed: new discord.RichEmbed()
            .setAuthor('Yui-chan', bot.user.avatarURL)
            .setColor(colorCodeYui)
            .setTitle("Command List")
            .setDescription(commands)
            .setFooter("Note: <>: obligatory param | <?> optional param | Permission: `BAN_MEMBERS` or above")
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
