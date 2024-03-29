const request = require('request');
const discord = require('discord.js');

const tenor_key = process.env.TENOR_KEY;
const anon_id = process.env.ANON_ID;
const OwnerID = process.env.OWNER_ID;

const colorCodeYui = 'FFA000';

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

function adminCommands(message, args) {
    if (isMyOwner(message.author.id) || message.member.hasPermission(['BAN_MEMBERS', 'KICK_MEMBERS'], false, true, true)) {
        let action = args.shift().toLowerCase();
        let mem = message.mentions.members.first();
        let testFormat = args.shift();
        if (mem && mem == testFormat) {          
            let reason = args.join(" ");
            switch (action) {
                case 'kick':
                    {
                        mem.kick(reason).then((mem) => {
                            message.channel.send('`' + mem.user.username + '` has been kicked by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to kick the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'ban':
                    {
                        mem.ban(reason).then((mem) => {
                            message.channel.send('`' + mem.user.username + '` has been banned by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to ban the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'mute':
                    {
                        mem.setMute(true, reason).then(() => {
                            message.channel.send('`' + mem.displayName + '` has been muted by `' + message.member.displayName + '` for reason: ' + reason);
                        }).catch(err => {
                            message.author.send("Unable to mute the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'unmute':
                    {
                        mem.setMute(false, reason).then(() => {
                            message.channel.send('`' + mem.displayName.toString() + '` has been unmuted by `' + message.member.displayName + '`');
                        }).catch(err => {
                            message.author.send("Unable to unmute the member. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'setnickname':
                    {
                        let oldname = mem.displayName;
                        mem.setNickname(reason).then(() => {
                            message.channel.send("`" + oldname + "'s` nickname is set to `" + reason + "` by `" + message.member.displayName + "`");
                        }).catch(err => {
                            message.author.send("Unable to set nickname. I don't have enough permissions.");
                            console.log(err);
                        });
                        break;
                    }
                case 'addrole':
                    {
                        let role = getRoleId(message.guild.roles, reason);
                        if (role[0]) {
                            if (!mem.roles.has(role[0])) {
                                mem.addRole(role[0]).then(() => {
                                    message.channel.send("Added role `" + role[1] + "` to `" + mem.displayName + "` by `" + message.member.displayName + "`");
                                }).catch(() => { 
                                    message.author.send("Something went wrong. Maybe i don't have enough permission to do this. ");
                                });
                            } else {
                                message.author.send("The member has already had the role `" + role[1] + "`");
                            }
                        } else {
                            message.author.send("Invalid role. Please try gain.")
                        }
                        break;
                    }
                case 'removerole':
                    {
                        let role = getRoleId(message.guild.roles, reason);
                        if (role[0]) {
                            if (mem.roles.has(role[0])) {
                                mem.removeRole(role[0]).then(() => {
                                    message.channel.send("Removed role `" + role[1] + "` from `" + mem.displayName + "` by `" + message.member.displayName + "`");
                                }).catch(() => { 
                                    message.author.send("Something went wrong. Maybe i don't have enough permission to do this. ");
                                });

                            } else {
                                message.author.send("The member doesn't have role `" + role[1] + "`");
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

function getPing(message, bot) {
    message.channel.send('Pinging...').then(sent => {
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
    if (isMyOwner(message.author.id) || message.member.hasPermission('BAN_MEMBERS', false, true, true)) {
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

function isMyOwner(UserID) {
    return (UserID === OwnerID);
}

function help(message, bot) {
    let commands = "**__Music:__**\n`play | p`: add to end\n" +
        "`pnext | pn`: add to next\n" +
        "`skip | next <?range>`: skip 1 or more song(s)\n" +
        "`leave | bye`: leave the bot\n" +
        "`join | come`: join the bot\n" +
        "`queue <?number>`: list out the queue at tab number (default 0)\n" +
        "`np | nowplaying`: currently playing song's info\n" +
        "`loop <?queue>`: loop the song/the queue\n" +
        "`pause`: pause the song\n" +
        "`resume`: resume pause\n" +
        "`shuffle`: shuffle the queue\n" +
        "`clear`: clear queue\n" +
        "`search`: search for a song, pick by index\n" +
        "`autoplay | ap`: from current Youtube channel\n" +
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
    getPing: getPing,
    say: say,
    help: help,
}
