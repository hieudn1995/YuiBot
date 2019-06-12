const discord = require('discord.js');
const request = require('request');
const ytdl = require('ytdl-core');
const getPlaylistID = require('get-youtube-playlist-id');
const getYoutubeID = require('get-youtube-id');
const song = require('./songMetaData');
const musicQueue = require('./musicQueue');

const ytapikey = process.env.YOUTUBE_API_KEY;

const colorCodeYui = 'FFA000';
var streams = new Map;

function pushStream(guild, boundVoiceChannel, boundTextChannel) {
    return streams.set(guild.id, {
        id: guild.id,
        name: guild.name,
        isLooping: false,
        isQueueLooping: false,
        isAutoPlaying: false,
        isPlaying: false,
        isPaused: false,
        streamDispatcher: undefined,
        voiceConnection: undefined,
        tmp_channelId: '',
        tmp_nextPage: '',
        queue: new musicQueue,
        boundVoiceChannel: boundVoiceChannel,
        boundTextChannel: boundTextChannel,
        leaveOnTimeout: undefined,
    });
}
function guildVoiceStateUpdate(oldMem, newMem) {
    let guildCheck = checkOnLeave(oldMem, newMem);
    switch (guildCheck.case) {
        case 'clear':
            {
                if (guildCheck.guild && guildCheck.guild.leaveOnTimeout) {
                    clearTimeout(guildCheck.guild.leaveOnTimeout);
                    guildCheck.guild.leaveOnTimeout = undefined;
                }
                break;
            }
        case 'ignore':
            {
                break;
            }
        case 'leave':
            {
                if (oldMem.voiceChannel.members.size === 1) {
                    guildCheck.guild.leaveOnTimeout = setTimeout(() => {
                        leaveVC(guildCheck.guild);
                    }, 15000);
                }
                break;
            }
    }

}
function checkOnLeave(oldMem, newMem) {
    let guild = streams.get(oldMem.guild.id);
    let boundVC = guild ? guild.boundVoiceChannel : undefined;
    if (boundVC) {
        let oldStat = oldMem.voiceChannel;
        let newStat = newMem.voiceChannel;
        if (newStat === boundVC) {
            return {
                guild: guild,
                case: 'clear',
            };
        } else
        if (!oldStat || oldStat !== boundVC) {
            return {
                guild: guild,
                case: 'ignore',
            };
        } else
        if (!newStat || newStat !== boundVC) {
            return {
                guild: guild,
                case: 'leave',
            };
        }
    } else {
        return {
            guild: guild,
            case: 'ignore',
        };
    }
}
function checkBoundChannel(message, join) {
    let boundVC = streams.has(message.guild.id) ? streams.get(message.guild.id).boundVoiceChannel : undefined;
    if (message.member.voiceChannel) {
        if (!boundVC && join) {
            let bound_vc = message.member.voiceChannel;
            let bound_tc = message.channel;
            message.channel.send("Bound to Text Channel: **`" + bound_vc.name + "`** and Voice Channel: **`" + bound_tc.name + "`**!");
            bound_vc.join();
            pushStream(message.guild, bound_vc, bound_tc);
            return true;
        } else {
            if (boundVC) {
                let bound_vc = streams.get(message.guild.id).boundVoiceChannel;
                let bound_tc = streams.get(message.guild.id).boundTextChannel;
                if (message.channel === bound_tc && message.member.voiceChannel === bound_vc) {
                    return true;
                } else message.reply("I'm playing at **`" + bound_tc.name + "`** -- **`" + bound_vc.name + "`**");
            } else {
                message.reply("I'm not in any voice channel.");
            }
            return false;
        }
    } else {
        message.reply("*please join a __Voice Channel__!*");
        return false;
    }
}

function resetChannelStat(guildId) {
    let guild = streams.get(guildId);
    guild.boundTextChannel = undefined;
    guild.boundVoiceChannel = undefined;
    streams.delete(guildId);
}

function leaveVC(guild) {
    guild.boundVoiceChannel.leave();
    guild.boundTextChannel.send("*There's no one around so I'll leave too. Bye~!*");
    resetStatus(guild.id);
    resetChannelStat(guild.id);
}

function createVoiceConnection(guild, message) {
    if (guild.voiceConnection) {
        return;
    } else {
        guild.voiceConnection = message.member.voiceChannel.connection;
    }
}

function play(message, args) {
    let guild = streams.get(message.guild.id);
    createVoiceConnection(guild, message);
    args = Array.isArray(args) ? args.join(" ") : args;
    if (isYtlink(args) && args.indexOf('list=') > -1) {
        queuePlaylist(guild, message, args);
    } else {
        queueSong(guild, message, args);
    }
}
async function queuePlaylist(guild, message, args) {
    try {
        await getPlaylistId(args, function (playlistID) {
            guild.boundTextChannel.send(":hourglass_flowing_sand: **_Loading playlist, please wait..._**").then(async (msg) => {
                let nextPageToken = '';
                let oldQueueLength = guild.queue.length;
                await getItems(guild, playlistID, nextPageToken, msg, oldQueueLength, message.member.displayName).catch(console.error);
            }).catch(console.error);
        });
    } catch (err) {
        guild.boundTextChannel.send("Sorry, something went wrong and i couldn't get the playlist.");
        return console.error(err);
    }
}

function getItems(guild, playlistID, nextPageToken, msgTemp, oldQueueLength, requester) {
    return new Promise((resolve, reject) => {
        request("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50" + nextPageToken + "&playlistId=" + playlistID +
            "&fields=items(id%2Ckind%2Csnippet(channelId%2CchannelTitle%2CresourceId(kind%2CvideoId)%2Ctitle))%2CnextPageToken&key=" + ytapikey,
            async function (error, response, body) {
                if (error) return reject(error);
                var json = JSON.parse(body);
                if (json.error) {
                    return reject(json.error);
                }
                await processData(guild.queue, json.items, requester).then(async () => {
                    if (json.nextPageToken) {
                        let nextPage = "&pageToken=" + json.nextPageToken;
                        await getItems(guild, playlistID, nextPage, msgTemp, oldQueueLength, requester).then(resolve).catch(console.log);
                    } else {
                        msgTemp.edit(":white_check_mark: **Enqueued " + (guild.queue.length - oldQueueLength) + " songs!**");
                        if (guild.isPlaying === false) {
                            guild.isPlaying = true;
                            playMusic(guild);
                            guild.boundTextChannel.send('**`🎶 Playlist starting - NOW! 🎶`**');
                            getChannelID_pl(guild);
                        }
                    }
                }, async (msg) => {
                    console.error(msg);
                    if (json.nextPageToken) {
                        let nextPage = "&pageToken=" + json.nextPageToken;
                        await getItems(guild, playlistID, nextPage, msgTemp, oldQueueLength, requester).then(resolve).catch(console.log);
                    } else {
                        msgTemp.edit(":white_check_mark: **Enqueued " + (guild.queue.length - oldQueueLength) + " songs!**");
                        if (guild.isPlaying === false) {
                            guild.isPlaying = true;
                            playMusic(guild);
                            guild.boundTextChannel.send('**`🎶 Playlist starting - NOW! 🎶`**');
                            getChannelID_pl(guild);
                        }
                    }

                });
            });
    });
}

function processData(queue, data, requester) {
    return new Promise((resolve, reject) => {
        var tmparr = [];
        for (const e of data) {
            tmparr.push(e.snippet.resourceId.videoId);
        }
        Promise.all(tmparr).then(async () => {
            await getInfoIds(queue, tmparr.join(','), requester, true).then(resolve).catch(console.error);
        }).catch(err => reject(err));
    });
}

function getInfoIds(queue, ids, requester, atEnd) {
    return new Promise((resolve, reject) => {
        request('https://www.googleapis.com/youtube/v3/videos?part=' + encodeURIComponent('snippet, contentDetails') + '&id=' + encodeURIComponent(ids) + '&fields=items(contentDetails%2Fduration%2Cid%2Csnippet(channelId%2CchannelTitle%2Cthumbnails%2Fdefault%2Ctitle))&key=' + ytapikey,
            async function (err, res, body) {
                if (err) reject(err);
                var json = JSON.parse(body);
                var promises = json.items.map((e) => {
                    pushToQueue(queue, e, requester, atEnd).catch(err => console.error(err));
                });
                Promise.all(promises).then(resolve).catch(console.error);
            });
    });
}

function pushToQueue(queue, data, requester, atEnd) {
    return new Promise(async (resolve, reject) => {
        if (!data.id) reject("Video not available.");
        else {
            let id = data.id,
                title = data.snippet.title,
                channel = data.snippet.channelTitle,
                duration = await youtubeTimeConverter(data.contentDetails.duration),
                vidUrl = "https://www.youtube.com/watch?v=" + id,
                thumbUrl = data.snippet.thumbnails.default.url;
            if (atEnd) {
                resolve(queue.addSong(new song(id, title, channel, duration, requester, vidUrl, thumbUrl)));
            } else {
                resolve(queue.addNext(new song(id, title, channel, duration, requester, vidUrl, thumbUrl)));
            }
        }
    });
}

function queueSong(guild, message, args) {
    let requester = message.member.displayName;
    let queue = guild.queue;
    let temp_status = '';
    getID(args, async function (id) {
        await getInfoIds(queue, id, requester, true).then(async () => {
            getChannelID_pl(guild);
            if (guild.isPlaying === false) {
                guild.isPlaying = true;
                playMusic(guild);
                temp_status = '♫ Now Playing ♫';
            } else {
                temp_status = '♬ Added To QUEUE ♬';
            }
            var np_box = "*`Channel`*: **`" + queue.last._channel + "`**\n*`Duration`*: **`" + await time_converter(queue.last._duration) + "`**" +
                ((queue.length === 1) ? "" : ("\n*`Position in queue`*: **`" + (queue.length - 1) + "`**"));
            var embed = new discord.RichEmbed()
                .setTitle(queue.last.title)
                .setAuthor(temp_status, message.author.avatarURL)
                .setDescription(np_box)
                .setColor(colorCodeYui)
                .setThumbnail(queue.last.thumbnailUrl)
                .setTimestamp()
                .setURL(queue.last.videoUrl)
                .setFooter('Requested by ' + requester)
            message.channel.send(embed);
        }, (error) => {
            console.log(error);
        });
    });
}

function addNext(message, args) {
    let guild = streams.get(message.guild.id);
    let queue = guild.queue;
    if (!guild.isPlaying || queue.isEmpty()) {
        return play(message, args);
    } else {
        args = args.join(" ");
        if (isYtlink(args) && args.indexOf('list=') > -1) {
            return guild.boundTextChannel.send("Currently cannot add playlist to next. Use `>play` instead.");
        }
        var requester = message.member.displayName;
        getID(args, async (id) => {
            await getInfoIds(queue, id, requester, false).then(async () => {
                var np_box = "*`Channel`*: **`" + queue.getAt(1).channel + "`**" +
                    "\n*`Duration`*: **`" + await time_converter(queue.getAt(1).duration) + "`**" +
                    "\n*`Position in queue`*: **`1`**";
                var embed = new discord.RichEmbed()
                    .setTitle(queue.getAt(1).title)
                    .setAuthor("♬ Added Next ♬", message.author.avatarURL)
                    .setDescription(np_box)
                    .setColor(colorCodeYui)
                    .setThumbnail(queue.getAt(1).thumbnailUrl)
                    .setTimestamp()
                    .setURL(queue.getAt(1).videoUrl)
                    .setFooter('Requested by ' + requester)
                guild.boundTextChannel.send(embed);
            }).catch(error => {
                guild.boundTextChannel.send("Oops! Sorry, something went wrong. I couldn't get the song.");
                console.error(error);
            });
        });
    }
}

function playMusic(guild) {
    let currSong = guild.queue.getAt(0);
    let qual = (currSong.duration === 'LIVE') ? '95' : 'highestaudio';
    let stream = ytdl('https://www.youtube.com/watch?v=' + currSong.id, {
        audioonly: true,
        quality: qual
    });
    if (stream.readable) connsole.log('Readable Stream');
    guild.streamDispatcher = guild.voiceConnection.playStream(stream, {
        volume: 0.7,
        passes: 2
    });
    let sent = undefined;
    guild.streamDispatcher.on('start', () => {
        console.log('Start');
        guild.voiceConnection.player.streamingData.pausedTime = 0;
        if (!guild.isLooping) {
            guild.boundTextChannel.send('**` 🎧 Now Playing: ' + guild.queue.getAt(0).title + '`**').then(msg => {
                sent = msg;
            });
        }
    });
    guild.streamDispatcher.on('end', (reason) => {
        console.log('End');
        if (sent) { sent.delete(1000); }
        let temp = guild.queue.shiftSong();
        if (guild.isLooping) {
            guild.queue.unshiftSong(temp);
        } else if (guild.isQueueLooping) {
            guild.queue.addSong(temp);
        }
        if (guild.queue.isEmpty()) {
            if (!guild.isAutoPlaying) {
                guild.voiceConnection.setSpeaking(false);
                resetStatus(guild.id);
            } else {
                return autoPlaySong(guild, temp.requester);
            }
        } else {
            playMusic(guild);
        }
    });
    //WORKED!
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&q=" + encodeURIComponent(query) +
        "&type=video&fields=items(id(kind%2CvideoId)%2Csnippet(channelId%2CchannelTitle%2Ctitle))&key=" + ytapikey,
        function (error, response, body) {
            var json = JSON.parse(body);
            if (!json.items[0]) {
                //tmp_channelId = 'UCSYy7SB18wxodxpI8TgBq3A';
                callback("3uOWvcFLUY0");
            } else {
                //tmp_channelId = json.items[0].snippet.channelId;
                callback(json.items[0].id.videoId);
            }
        });
}

function searchSong(query, message) {
    request('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=' + encodeURIComponent(query) +
        '&type=video&fields=items(id%2Ckind%2Csnippet(channelId%2CchannelTitle%2Ctitle))&key=' + ytapikey,
        function (err, respond, body) {
            if (err) return console.error(err);
            var json = JSON.parse(body);
            if (json.error) {
                message.channel.send('Got error, code: ' + json.error.code + ' with message: ' + json.error.message);
                return console.error(json.error);
            }
            if (json.items[0]) {
                var name_box = [];
                json.items.forEach((e) => {
                    name_box.push(e.snippet.title);
                });
                let temp1 = "```css\nPick one option from the list below, or type cancel to break.\n\n";
                for (let i = 0; i < name_box.length; i++) {
                    let temp2 = "#" + (i + 1) + ": " + name_box[i] + "\n";
                    temp1 += temp2;
                }
                temp1 += "```";
                message.channel.send(temp1).then((message) => {
                    message.delete(15000);
                }).catch(err => {
                    return console.error(err);
                });
                const collector = message.channel.createMessageCollector(m => m.author.id === message.author.id && m.channel.id === message.channel.id, {
                    time: 15000
                });
                collector.on('collect', (collected) => {
                    collector.stop();
                    if (collected.content.toLowerCase() === 'cancel') {
                        message.channel.send("**`Canceled!`**");
                    } else {
                        let index = collected.content.trim().split(" ");
                        if (!isNaN(index) && (index > 0 && index <= 10)) {
                            return play(message, name_box[index - 1]);
                        } else {
                            message.channel.send('Invailid option! Action aborted.')
                        }
                    }
                });
                collector.on('end', (collected) => {
                    if (collected.size < 1) return message.channel.send(':ok_hand: Action aborted.');
                });
            }
        });
}


function RNG(range) {
    return new Promise(resolve => {
        resolve(Math.floor(Math.random() * range));
    });
}

function autoPlay(message) {
    let guild = streams.get(message.guild.id);
    if (!guild.isAutoPlaying) {
        guild.isAutoPlaying = true;
        createVoiceConnection(guild, message);
        guild.boundTextChannel.send("**`📻 YUI's PABX MODE - ON! 🎶 - with you wherever you go.`**");
        if (!guild.queue.isEmpty()) {
            getChannelID_pl(guild);
        } else {
            guild.boundTextChannel.send("Ok, now where do we start? How about you add something first? XD");
        }
    } else {
        guild.isAutoPlaying = false;
        guild.boundTextChannel.send("**`📻 YUI's PABX MODE - OFF! 🎵`**");
    }
}

function getChannelID_pl(guild) {
    request('https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + guild.queue.last.id + '&fields=items%2Fsnippet%2FchannelId&key=' + ytapikey,
        function (err, respond, body) {
            if (err) return console.error(err);
            var json = JSON.parse(body);
            if (json.error) return console.error(json.error);
            guild.tmp_channelId = json.items[0].snippet.channelId;
        });
}

async function autoPlaySong(guild, requester) {
    let nextPage = (guild.tmp_nextPage !== "") ? ("&pageToken=" + guild.tmp_nextPage) : "";
    let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + guild.tmp_channelId + nextPage +
    '&type=video&fields=items(id%2FvideoId%2Csnippet(channelId%2CchannelTitle%2Cthumbnails%2Fdefault%2Ctitle))%2CnextPageToken&key=' + ytapikey;
    request(url, async (err, respond, body) => {
            if (err) {
                autoPlaySong(guild, requester);
                delete nextPage; delete url;
                return console.error('request-err:' + err); 
            }
            var json = JSON.parse(body);
            if (json.error) {
                autoPlaySong(guild, requester);
                delete nextPage; delete url;
                return console.error("json-err:" + json.error); 
            }
            await RNG(json.items.length).then(async (rnd) => {
                if (json.items[rnd]) {
                    guild.tmp_nextPage = json.nextPageToken ? json.nextPageToken : "";
                    await getInfoIds(guild.queue, json.items[rnd].id.videoId, requester, true).then(() => {
                        delete nextPage; delete url;
                        playMusic(guild);
                    }, (error) => {
                        autoPlaySong(guild, requester);
                        delete nextPage; delete url;
                        return console.error('local-getInfoIds-err:' + error);
                    });
                }
            });
        });
}

function pauseStream(message) {
    let guild = streams.get(message.guild.id);
    if (guild.streamDispatcher) {
        if (!guild.isPaused) {
            guild.streamDispatcher.pause();
            guild.isPaused = true;
            guild.boundTextChannel.send(" :pause_button: **Paused!**");
        } else {
            guild.boundTextChannel.send("*Currently paused!*");
        }
    } else {
        guild.boundTextChannel.send("I'm not playing anything.");
    }
}

function resumeStream(message) {
    let guild = streams.get(message.guild.id);
    if (guild.streamDispatcher) {
        if (guild.isPaused) {
            guild.streamDispatcher.resume();
            guild.isPaused = false;
            guild.boundTextChannel.send(" :arrow_forward: **Continue playing~!**");
        } else {
            guild.boundTextChannel.send("*Currently playing!*");
        }
    } else {
        guild.boundTextChannel.send("I'm not playing anything.");
    }
}

function resetStatus(guildId) {
    let guild = streams.get(guildId);
    if (guild) {
        guild.isAutoPlaying = false;
        guild.isQueueLooping = false;
        guild.isLooping = false;
        guild.isPause = false;
        guild.queue.deleteQueue();
        if (guild.isPlaying) {
            if (guild.streamDispatcher) {
                guild.voiceConnection.player.destroy();
                guild.streamDispatcher.end();
            }
            guild.isPlaying = false;
        }
    } else {
        return console.log("Reset_status_no_guild.");
    }
}

function loopSettings(message, args) {
    let guild = streams.get(message.guild.id);
    if (guild && !args[0]) {
        if (!guild.isLooping) {
            guild.isLooping = true;
            guild.boundTextChannel.send(' :repeat: _**Loop enabled!**_');
        } else {
            guild.isLooping = false;
            guild.boundTextChannel.send(' :twisted_rightwards_arrows: _**Loop disabled!**_');
        }
    } else if (args[0].toLowerCase() === 'queue') {
        if (!guild.isQueueLooping) {
            guild.isQueueLooping = true;
            guild.boundTextChannel.send(' :repeat: _**Queue loop enabled!**_');
        } else {
            guild.isQueueLooping = false;
            guild.boundTextChannel.send(' :twisted_rightwards_arrows: _**Queue loop disabled!**_');
        }
    } else {
        guild.boundTextChannel.send('Invailid option, action aborted!');
    }
}

function shuffleQueue(message) {
    let guild = streams.get(message.guild.id);
    if (!guild.queue.isEmpty()) {
        guild.queue.shuffle();
        guild.boundTextChannel.send(':twisted_rightwards_arrows: **QUEUE shuffled!**');
    } else {
        guild.boundTextChannel.send("I'm not playing anything!");
    }
}

function printData(queue, start, end, border) {
    return new Promise(async (resolve) => {
        var result = "";
        for (let i = start; i <= end && i < border; i++) {
            let s = queue.getAt(i);
            result += "#" + (i) + ": **" + s.title + "** - `(" + await time_converter(s.duration) + ")`" + "\n*Requested by `" + s.requester + "`*\n\n";
        }
        resolve(result);
    });
}

async function check_queue(message, args) {
    let guild = streams.get(message.guild.id);
    if (guild.queue.isEmpty()) {
        return guild.boundTextChannel.send('**`Nothing in queue.`**');
    }
    var n = guild.queue.length;
    let tabs = Math.ceil((n - 1) / 10);
    if (tabs === 0) tabs = 1;
    if (!args[0] || args[0] === 1) {
        let np = guild.queue.getAt(0);
        let data = "**__NOW PLAYING:__**\n**`🎶` " + np.title + " `🎶`** - `(" + await time_converter(np.duration) + ")`\n*Requested by `" + np.requester + "`*\n\n";
        if (n > 1) {
            data += "**__QUEUE LIST:__**\n";
            if (n <= 10) {
                data += await printData(guild.queue, 1, n - 1, n);
            } else {
                data += await printData(guild.queue, 1, 10, n);
                data += "And another `" + (n - 11) + "` songs.\n";
            }
        }
        let qlength;
        if (guild.isQueueLooping) {
            qlength = 'QUEUE Looping';
        } else {
            qlength = await time_converter(await queue_length(guild));
        }
        data += "**" + guild.name + "'s** total queue duration: `" + qlength + "` -- Tab: `1/" + tabs + "`";
        guild.boundTextChannel.send({
            embed: new discord.RichEmbed()
                .setColor(colorCodeYui)
                .setDescription(data)
        });
    } else if ((args[0] > tabs) || isNaN(args[0])) return;
    else {
        let currTab = Number(args[0]);
        let pos = (currTab - 1) * 10 + 1;
        let data = "**__QUEUE LIST:__**\n";
        data += await printData(guild.queue, pos, pos + 9, n);
        let qlength;
        if (guild.isQueueLooping) {
            qlength = "QUEUE Looping";
        } else {
            qlength = await time_converter(await queue_length(guild));
        }
        data += "**" + guild.name + "'s** total queue duration: `" + qlength + "` -- Tab: `" + currTab + "/" + tabs + "`";
        guild.boundTextChannel.send({
            embed: new discord.RichEmbed()
                .setColor(colorCodeYui)
                .setDescription(data)
        });
    }
}

function skip_songs(message, args) {
    let guild = streams.get(message.guild.id);
    if (guild.queue.isEmpty()) {
        return guild.boundTextChannel.send('Nothing is playing.');
    } else {
        switch (args.length) {
            case 0:
                {
                    if (guild.isLooping) {
                        guild.isLooping = false;
                    }
                    if (guild.streamDispatcher) {
                        guild.boundTextChannel.send(" :fast_forward: **Skipped!**");
                        guild.streamDispatcher.end();
                    }
                    break;
                }
            case 1:
                {
                    if (!isNaN(args[0])) {
                        let t = Number(args[0]);
                        if (t < 0 || t > guild.queue.length) {
                            return guild.boundTextChannel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
                        }
                        guild.queue.spliceSongs(1, t);
                        if (guild.isLooping) {
                            guild.isLooping = false;
                        }
                        if (guild.streamDispatcher) {
                            guild.boundTextChannel.send(" :fast_forward: **Skipped " + t + " songs!**");
                            guild.streamDispatcher.end();
                        }
                    } else {
                        guild.boundTextChannel.send("Please enter a number!");
                    }
                    break;
                }
        }
    }
}

function remove_songs(message, args) {
    let guild = streams.get(message.guild.id);
    switch (args.length) {
        case 0:
            {
                return guild.boundTextChannel.send("Please choose certain song(s) from QUEUE to remove.");
            }
        case 1:
            {
                let index = args[0];
                if (isNaN(index)) {
                    if (index === 'last') {
                        guild.boundTextChannel.send('**`' + queue.popLast() + '` has been removed from QUEUE!**');
                    } else {
                        guild.boundTextChannel.send('Invailid option! Action aborted.');
                    }
                } else {
                    Number(index);
                    if (index < 0 || index > guild.queue.length) {
                        guild.boundTextChannel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
                    } else if (index === 0) {
                        skip_songs(message, args);
                    } else {
                        guild.boundTextChannel.send('**`' + guild.queue.spliceSong(index) + '` has been removed from QUEUE!**');
                    }
                }
                break;
            }
        case 2:
            {
                if (isNaN(args[0]) || isNaN(args[1])) {
                    return guild.boundTextChannel.send('Invailid option! Action aborted.');
                } else {
                    let pos = Number(args[0]);
                    let length = Number(args[1]);
                    if (pos < 1 || pos > guild.queue.length || length > (guild.queue.length - pos)) {
                        return guild.boundTextChannel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
                    }
                    guild.queue.spliceSongs(pos, length);
                    guild.boundTextChannel.send('**Songs from number ' + pos + ' to ' + (pos + length - 1) + ' removed from QUEUE!**');
                }
                break;
            }
    }
}
async function getNowPlayingData(message, bot) {
    let guild = streams.get(message.guild.id);
    if (guild.queue.isEmpty()) {
        return guild.boundTextChannel.send("Nothing is playing.");
    }
    let currSong = guild.queue.getAt(0);
    let t = Math.round(guild.streamDispatcher.time / 1000);
    let np_box = "**`" + await time_converter(t) + "`𝗹" +
        await createProgressBar(t, currSong.duration) + "𝗹`" +
        await time_converter(currSong.duration) + "`**\n__`Channel`__: **`" + currSong.channel + "`**";
    const embed = new discord.RichEmbed()
        .setTitle(currSong.title)
        .setAuthor('♫ Now Playing ♫', bot.user.avatarURL)
        .setDescription(np_box)
        .setColor(colorCodeYui)
        .setThumbnail(currSong.thumbnailUrl)
        .setURL(currSong.videoUrl)
        .setFooter('Requested by ' + currSong.requester)
    guild.boundTextChannel.send({
        embed
    });
}

function clearQueue(message) {
    let guild = streams.get(message.guild.id);
    if (!guild.queue.isEmpty()) {
        guild.queue.clearQueue();
        guild.boundTextChannel.send(":x: **Queue cleared!**");
    } else {
        guild.boundTextChannel.send("Queue is empty.");
    }
}

function stopPlaying(message) {
    guild = streams.get(message.guild.id);
    if (guild.isPlaying) {
        guild.queue.deleteQueue();
        resetStatus(guild.id);
        guild.boundTextChannel.send("**Stopped!**");
    } else {
        guild.boundTextChannel.send('Nothing is playing!');
    }
}
function queue_length(guild) {
    return new Promise((resolve) => {
        try {
            return resolve(guild.queue.totalDurLength());
        } catch (error) {
            return resolve(0);
        }
    });
}

function getID(str, callback) {
    if (isYtlink(str)) {
        callback(getYoutubeID(str));
    } else {
        search_video(str, function (id) {
            callback(id);
        });
    }
}

function getPlaylistId(args, callback) {
    if (!isYtlink(args)) {
        throw new Error('Argument is not a youtube link.');
    } else {
        callback(getPlaylistID(args));
    }
}

function isYtlink(str) {
    if (typeof str === 'string') {
        return (str.indexOf('youtube.com') >= 0) || (str.indexOf('youtu.be') >= 0);
    } else return false;
}

function time_converter(num) {
    return new Promise(resolve => {
        if (num == 0) {
            return resolve('LIVE');
        }
        let t1 = Math.floor(num / 60);
        let t2 = num % 60;
        if (t1 < 60) {
            return resolve(t2 >= 10 ? t1 + ":" + t2 : t1 + ":0" + t2);
        } else {
            let t3 = Math.floor(t1 / 60);
            let t4 = t1 % 60;
            let t5 = (t2 >= 10 ? t2 : "0" + t2);
            return resolve(t4 >= 10 ? (t3 + ":" + t4 + ":" + t5) : (t3 + ":0" + t4 + ":" + t5));
        }
    });
}

function createProgressBar(num_progress, num_total) {
    if (isNaN(num_total)) {
        return '---------------------------------------⦿';
    } else {
        let t = '----------------------------------------';
        let index = Math.round(((num_progress / num_total) * 40));
        return t.substr(0, index) + '⦿' + t.substr(index + 1);
    }
}

function youtubeTimeConverter(duration) {
    return new Promise((resolve) => {
        var a = duration.match(/\d+/g);
        if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
            a = [0, a[0], 0];
        }
        if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
            a = [a[0], 0, a[1]];
        }
        if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
            a = [a[0], 0, 0];
        }
        duration = 0;
        if (a.length == 3) {
            duration = duration + parseInt(a[0]) * 3600;
            duration = duration + parseInt(a[1]) * 60;
            duration = duration + parseInt(a[2]);
        }
        if (a.length == 2) {
            duration = duration + parseInt(a[0]) * 60;
            duration = duration + parseInt(a[1]);
        }
        if (a.length == 1) {
            duration = duration + parseInt(a[0]);
        }
        resolve(duration);
    });
}

module.exports = {
    play: play,
    addNext: addNext,
    searchSong: searchSong,
    autoPlay: autoPlay,
    check_queue: check_queue,
    remove_songs: remove_songs,
    skip_songs: skip_songs,
    shuffleQ: shuffleQueue,
    resetStatus: resetStatus,
    nowPlaying: getNowPlayingData,
    loopSetting: loopSettings,
    pause: pauseStream,
    resume: resumeStream,
    clearQueue: clearQueue,
    stop: stopPlaying,
    checkChannel: checkBoundChannel,
    resetChannelStat: resetChannelStat,
    guildVoiceStateUpdate: guildVoiceStateUpdate,
}
