const discord = require('discord.js');
const request = require('request');
const ytdl = require('ytdl-core');
const song = require('./songMetaData');
const getPlaylistID = require('get-youtube-playlist-id');
const getYoutubeID = require('get-youtube-id');
const ytapikey = process.env.YOUTUBE_API_KEY;
const colorCodeYui = 'FFA000';

var isAutoPlaying = false;
var isLooping = false;
var isQueueLooping = false;
var isPlaying = false;
var streamDispatcher = undefined;
var voiceConnection = undefined;
var isPause = false;
var tmp_channelId = '';

function createVoiceConnection(message) {
    if (voiceConnection) {
        return;
    } else {
        message.member.voiceChannel.join().then(Connection => {
            voiceConnection = Connection;
        });
    }
}

function play(message, queue, args) {
    args = args.join(" ");
    if (isYtlink(args) && args.indexOf('list=') > -1) {
        queuePlaylist(message, queue, args);
    } else {
        queueSong(message, queue, args);
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
async function queuePlaylist(message, queue, args) {
    createVoiceConnection(message);
    try {
        await getPlaylistId(args, function (playlist_id) {
            message.channel.send(":hourglass_flowing_sand: **_Loading playlist, please wait..._**").then(async msg => {
                let nextPageToken = '';
                let oldQueueLength = queue.length();
                await getItems(queue, playlist_id, nextPageToken, msg, oldQueueLength, message);
            });
        });
    } catch (err) {
        message.channel.send("Sorry, something went wrong and i couldn't get the playlist.");
        return console.error(err);
    }
}

async function getItems(queue, id, nextPageToken, message, oldQueueLength, originalMessage) {
    return new Promise((resolve) => {
        request("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50" + nextPageToken + "&playlistId=" + id +
            "&fields=items(id%2Ckind%2Csnippet(channelId%2CchannelTitle%2CresourceId(kind%2CvideoId)%2Ctitle))%2CnextPageToken&key=" + ytapikey,
            async function (error, response, body) {
                var json = JSON.parse(body);
                if (json.error) {
                    originalMessage.channel.send('Got error, code: ' + json.error.code + ', with message: ' + json.error.message);
                    return console.error(json.error);
                }
                await processData(json.items, queue, originalMessage.member.displayName).then(() => {
                    setTimeout(async () => {
                        if (json.nextPageToken) {
                            let nextPage = "&pageToken=" + json.nextPageToken;
                            await getItems(queue, id, nextPage, message, oldQueueLength, originalMessage).then(resolve);
                        } else {
                            message.edit(":white_check_mark: **Enqueued " + (queue.length() - oldQueueLength) + " songs!**");
                            if (isPlaying === false) {
                                isPlaying = true;
                                playMusic(queue, queue.songs[0]._id, originalMessage);
                                originalMessage.channel.send('**`🎶 Playlist starting - NOW! 🎶`**');
                                getChannelID_pl(queue.last()._id);
                            }
                        }
                    }, 50);
                }, (msg) => {
                    console.error(msg);
                    setTimeout(async () => {
                        if (json.nextPageToken) {
                            let nextPage = "&pageToken=" + json.nextPageToken;
                            await getItems(queue, id, nextPage, message, oldQueueLength, originalMessage).then(resolve);
                        } else {
                            message.edit(":white_check_mark: **Enqueued " + (queue.length() - oldQueueLength) + " songs!**");
                            if (isPlaying === false) {
                                isPlaying = true;
                                playMusic(queue, queue.songs[0]._id, originalMessage);
                                originalMessage.channel.send('**`🎶 Playlist starting - NOW! 🎶`**');
                                getChannelID_pl(queue.last()._id);
                            }
                        }
                    }, 50);
                });
            });
    });
}

function processData(data, queue, requester) {
    return new Promise((resolve, reject) => {
            var promises = data.map(async function (e) {
                await ytdlGetInfo(queue, e.snippet.resourceId.videoId, requester).catch(err => console.error(err));
            });
            Promise.all(promises).then(resolve).catch(err => reject(err));
    });
}

function queueSong(message, queue, args) {
    createVoiceConnection(message);
    var requester = message.member.displayName;
    let temp_status = '';
    getID(args, async function (id) {
        await ytdlGetInfo(queue, id, requester).then(async () => {
            getChannelID_pl(id);
            if (isPlaying === false) {
                isPlaying = true;
                playMusic(queue, id, message);
                temp_status = '♫ Now Playing ♫';
            } else {
                temp_status = '♬ Added To QUEUE ♬';
            }
            var np_box = "*`Channel`*: **`" + queue.last()._channel + "`**\n*`Duration`*: **`" + await time_converter(queue.last()._duration) + "`**" +
                ((queue.length() === 1) ? "" : ("\n*`Position in queue`*: **`" + (queue.length() - 1) + "`**"));
            var embed = new discord.RichEmbed()
                .setTitle(queue.last()._name)
                .setAuthor(temp_status, message.author.avatarURL)
                .setDescription(np_box)
                .setColor(colorCodeYui)
                .setThumbnail(queue.last()._thumbUrl)
                .setTimestamp()
                .setURL(queue.last()._vidUrl)
                .setFooter('Requested by ' + requester)
            message.channel.send(embed);
        }, (error) => {
            console.log(error);
        });
    });
}

function addNext(message, queue, args) {
    if (queue.isEmpty() || !isPlaying) {
        return queueSong(message, queue, args);
    } else {
        args = args.join(" ");
        if (isYtlink(args) && args.indexOf('list=') > -1) {
            return message.channel.send("Currently cannot add playlist to next. Use `>play` instead.");
        }
        var requester = message.member.displayName;
        getID(args, async (id) => {
            await ytdlGetInfoNext(queue, id, requester).then(async () => {
                var np_box = "*`Channel`*: **`" + queue.getAt(1)._channel + "`**" +
                    "\n*`Duration`*: **`" + await time_converter(queue.getAt(1)._duration) + "`**" +
                    "\n*`Position in queue`*: **`1`**";
                var embed = new discord.RichEmbed()
                    .setTitle(queue.getAt(1)._name)
                    .setAuthor("♬ Added Next ♬", message.author.avatarURL)
                    .setDescription(np_box)
                    .setColor(colorCodeYui)
                    .setThumbnail(queue.getAt(1)._thumbUrl)
                    .setTimestamp()
                    .setURL(queue.getAt(1)._vidUrl)
                    .setFooter('Requested by ' + requester)
                message.channel.send(embed);
            }).catch(error => {
                message.channel.send("Oops! Sorry, something went wrong. I couldn't get the song.");
                console.error(error);
            });
        });
    }
}

function playMusic(queue, id, message) {
    let qual = (queue.songs[0]._duration === 'LIVE') ? '95' : 'highestaudio';
    stream = ytdl('https://www.youtube.com/watch?v=' + id, {
        audioonly: true,
        quality: qual
    });
    streamDispatcher = voiceConnection.playStream(stream, {
        volume: 0.75
    });
    let sent;
    streamDispatcher.on('start', () => {
        voiceConnection.player.streamingData.pausedTime = 0;
        if (!isLooping) {
            message.channel.send('**`Now Playing: 🎧 ' + queue.songs[0]._name + '!`**').then(msg => {
                sent = msg;
            });
        }
    });
    streamDispatcher.on('end', () => {
        if (sent) {
            sent.delete(50);
        }
        var temp = queue.shiftSong();
        if (isLooping) {
            queue.unshiftSong(temp);
        } else if (isQueueLooping) {
            queue.addSong(temp);
        }
        if (queue.isEmpty()) {
            if (!isAutoPlaying) {
                voiceConnection.player.destroy();
                resetStatus();
            } else {
                autoPlaySong(queue, tmp_channelId, message);
            }
        } else {
            setTimeout(() => {
                playMusic(queue, queue.songs[0]._id, message);
            }, 100);
        }
    });
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&q=" + encodeURIComponent(query) +
        "&type=video&fields=items(id(kind%2CvideoId)%2Csnippet(channelId%2CchannelTitle%2Ctitle))&key=" + ytapikey,
        function (error, response, body) {
            var json = JSON.parse(body);
            if (!json.items[0]) {
                tmp_channelId = 'UCSYy7SB18wxodxpI8TgBq3A';
                callback("3uOWvcFLUY0");
            } else {
                tmp_channelId = json.items[0].snippet.channelId;
                callback(json.items[0].id.videoId);
            }
        });
}

function search_list(query, queue, message) {
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
                var id_box = [];
                var name_box = [];
                json.items.forEach((e) => {
                    id_box.push(e.id.videoId);
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
                            let id_search = id_box[index - 1];
                            queueSong(message, queue, id_search);
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
async function ytdlGetInfo(queue, id, requester) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(id, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve(queue.addSong(new song(info.video_id, info.title, info.author.name,
                        info.length_seconds, requester, info.video_url, info.thumbnail_url)));
            }
        });
    });
}
async function ytdlGetInfoNext(queue, id, requester) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(id, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve(queue.addNext(new song(info.video_id, info.title, info.author.name,
                    info.length_seconds, requester, info.video_url, info.thumbnail_url)));
            }
        });
    });
}
//auto play music
function RNG(range) {
    return new Promise(resolve => {
        resolve(Math.floor(Math.random() * range));
    });
}

function autoPlay(queue, message) {
    if (!isAutoPlaying) {
        isAutoPlaying = true;
        createVoiceConnection(message);
        message.channel.send("**`📻 YUI's PABX MODE - ON! 🎶 - with you wherever you go.`**");
        if (!queue.isEmpty()) {
            getChannelID_pl(queue.last()._id);
        } else {
            message.channel.send("*Ok, now where do we start? How about you add something first? XD*");
        }
    } else {
        isAutoPlaying = false;
        message.channel.send("**`📻 YUI's PABX MODE - OFF! 🎵`**");
    }
}

function getChannelID_pl(id) {
    request('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&relatedToVideoId=' + id +
        '&type=video&fields=items%2Fsnippet%2FchannelId&key=' + ytapikey,
        function (err, respond, body) {
            if (err) return console.error(err);
            var json = JSON.parse(body);
            if (json.error) return console.error(json.error);
            tmp_channelId = json.items[0].snippet.channelId;
        });
}

function autoPlaySong(queue, channelId_related, msg) {
    request('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + channelId_related +
        '&maxResults=50&type=video&fields=items(id%2Ckind%2Csnippet(channelId%2CchannelTitle%2Ctitle))&key=' + ytapikey,
        async (err, respond, body) => {
            if (err) return console.error(err);
            var json = JSON.parse(body);
            if (json.error) return console.error(json.error);
            await RNG(json.items.length).then(async (rnd) => {
                if (json.items[rnd]) {
                    await ytdlGetInfo(queue, json.items[rnd].id.videoId, msg.msg.member.displayName).then(() => {
                        playMusic(queue, queue.songs[0]._id, msg);
                    }, (error) => {
                        autoPlaySong(queue, channelId_related, msg);
                        return console.error(error);
                    });
                }
            });
        });
}

function pauseStream(message) {
    if (streamDispatcher) {
        if (!isPause) {
            streamDispatcher.pause();
            isPause = true;
            message.channel.send(" :pause_button: **Paused!**");
        } else {
            message.channel.send("*Currently paused!*");
        }
    } else {
        message.channel.send("I'm not playing anything.");
    }
}

function resumeStream(message) {
    if (streamDispatcher) {
        if (isPause) {
            streamDispatcher.resume();
            isPause = false;
            message.channel.send(" :arrow_forward: **Continue playing~!**");
        } else {
            message.channel.send("*Currently playing!*");
        }
    } else {
        message.channel.send("I'm not playing anything.");
    }
}

function resetStatus() {
    isAutoPlaying = false;
    isQueueLooping = false;
    isLooping = false;
    isPause = false;
    if (isPlaying) {
        if (streamDispatcher) {
            streamDispatcher.end();            
        }
        isPlaying = false;
        streamDispatcher = undefined;
        voiceConnection = undefined;
    }
}
    

function loopSetting(message, args) {
    if (!args[0]) {
        if (!isLooping) {
            isLooping = true;
            message.channel.send(' :repeat: _**Loop enabled!**_');
        } else {
            isLooping = false;
            message.channel.send(' :twisted_rightwards_arrows: _**Loop disabled!**_');
        }
    } else if (args[0].toLowerCase() === 'queue') {
        if (!isQueueLooping) {
            isQueueLooping = true;
            message.channel.send(' :repeat: _**Queue loop enabled!**_');
        } else {
            isQueueLooping = false;
            message.channel.send(' :twisted_rightwards_arrows: _**Queue loop disabled!**_');
        }
    } else {
        message.channel.send('Invailid option, action aborted!');
        return;
    }
}

function shuffle_queue(queue) {
    for (var i = queue.length() - 1; i > 1; i--) {
        let j = Math.floor(Math.random() * (i)) + 1;
        let temp = queue.songs[i];
        queue.songs[i] = queue.songs[j];
        queue.songs[j] = temp;
    }
}
async function check_queue(queue, message, args) {
    if (queue.isEmpty()) return message.channel.send('**`Nothing in queue.`**');
    var n = queue.length();
    let tabs = Math.ceil((n - 1) / 10);
    if (tabs === 0) tabs = 1;
    if (!args[0] || args[0] === 1) {
        let t2 = " ```css\n---------------NOW PLAYING---------------\n🎶 " + queue.songs[0]._name + " 🎶\n[Requested by " + queue.songs[0]._requester + "]\n\n";
        if (n > 1) {
            let t3 = "---------------QUEUE LIST-----------------\n";
            t2 += t3;
            if (n <= 10) {
                for (var i = 1; i < n; i++) {
                    var temp = "#" + (i) + ": " + queue.songs[i]._name + "\n[Requested by " + queue.songs[i]._requester + "]\n\n";
                    t2 += temp;
                }
            } else {
                for (var i = 1; i <= 10; i++) {
                    var temp = "#" + (i) + ": " + queue.songs[i]._name + "\n[Requested by " + queue.songs[i]._requester + "]\n\n";
                    t2 += temp;
                }
                t2 += "And another " + (n - 11) + " songs.\n";
            }
        }
        let qlength;
        if (isQueueLooping) {
            qlength = 'QUEUE Looping';
        } else {
            qlength = await time_converter(await queue_length(queue));
        }
        t2 += "Total QUEUE length: [" + qlength + "]  --   Tab: [1/" + tabs + "]";
        t2 += "```";
        message.channel.send(t2);
    } else if ((args[0] > tabs) || isNaN(args[0])) return;
    else {
        let t = Number(args[0]);
        let pos = (t - 1) * 10 + 1;
        let t1 = " ```css\n---------------QUEUE LIST-----------------\n";
        for (var i = pos; i < (pos + 10) && i < n; i++) {
            var temp = "#" + (i) + ": " + queue.songs[i]._name + "\n[Requested by " + queue.songs[i]._requester + "]\n\n";
            t1 += temp;
        }
        let qlength;
        if (isQueueLooping) {
            qlength = 'QUEUE Looping';
        } else {
            qlength = await time_converter(await queue_length(queue));
        }
        t1 += "Total QUEUE length: [" + qlength + "]  -- Tab: [" + t + "/" + tabs + "]";
        t1 += "```";
        message.channel.send(t1);
    }
}

function skip_songs(message, queue, args) {
    if (!args[0]) {
        if (isLooping) {
            isLooping = false;
        }
        message.channel.send(" :fast_forward: **Skipped!**");
        if (streamDispatcher) {
            streamDispatcher.end();
        }
    } else if (isNaN(args[0])) {
        message.channel.send('Invailid option! Action aborted.');
        return;
    } else {
        let t = Number(args[0]);
        if (t < 0 || t > queue.length()) {
            return message.channel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
        }
        queue.spliceSongs(1, t);
        if (isLooping) {
            isLooping = false;
        }
        message.channel.send(" :fast_forward: **Skipped " + t + " songs!**");
        if (streamDispatcher) {
            streamDispatcher.end();
        }
    }
}

function remove_songs(message, queue, args) {
    if (!args[0]) {
        message.channel.send("Please choose certain song(s) from QUEUE to remove.");
        return;
    } else if (args.length === 1) {
        let index = args[0];
        if (isNaN(index)) {
            if (index = 'last') {
                message.channel.send('**`' + queue.popLast() + '` has been removed from QUEUE!**');
            } else {
                message.channel.send('Invailid option! Action aborted.');
                return;
            }
        } else {
            Number(index);
            if (index < 0 || index > queue.length()) {
                return message.channel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
            } else if (index === 0) {
                return skip_songs(message, queue, args);
            } else {
                message.channel.send('**`' + queue.spliceSong(index) + '` has been removed from QUEUE!**');
            }
        }
    } else {
        if (isNaN(args[0]) || isNaN(args[1])) {
            message.channel.send('Invailid option! Action aborted.');
            return;
        } else {
            let pos = Number(args[0]);
            let length = Number(args[1]);
            if (pos < 1 || pos > queue.length() || length > (queue.length() - pos)) {
                return message.channel.send('Index out of range! Please choose a valid one, use `>queue` for checking.');
            }
            queue.spliceSongs(pos, length);
            message.channel.send('**Songs from number ' + pos + ' to ' + (pos + length - 1) + ' removed from QUEUE!**');
        }
    }
}
async function getNowPlayingData(currSong, message, bot) {
    let t = Math.round(streamDispatcher.time / 1000);
    let np_box = "**`" + await time_converter(t) + "`𝗹" +
        await create_progressbar(t, currSong._duration) + "𝗹`" +
        await time_converter(currSong._duration) + "`**\n__`Channel`__: **`" + currSong._channel + "`**";
    var embed = new discord.RichEmbed()
        .setTitle(currSong._name)
        .setAuthor('♫ Now Playing ♫', bot.user.avatarURL)
        .setDescription(np_box)
        .setColor(colorCodeYui)
        .setThumbnail(currSong._thumbUrl)
        .setURL(currSong._vidUrl)
        .setFooter('Requested by ' + currSong._requester)
    message.channel.send({ embed });
}

async function queue_length(queue) {
    return new Promise((resolve) => {
        try {
            return resolve(queue.totalDurLength());
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

function isYtlink(str) {
    if (typeof str === 'string') {
        return (str.indexOf('youtube.com') >= 0) || (str.indexOf('youtu.be') >= 0);
    } else return false;
}

async function time_converter(num) {
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

function create_progressbar(num_progress, num_total) {
    if (isNaN(num_total)) {
        return '---------------------------------------⦿';
    } else {
        let t = '----------------------------------------';
        let index = Math.round(((num_progress / num_total) * 40));
        return t.substr(0, index) + '⦿' + t.substr(index + 1);
    }
}
module.exports = {
    play: play,
    addNext: addNext,
    search_list: search_list,
    autoPlay: autoPlay,
    getChannelID_pl: getChannelID_pl,
    check_queue: check_queue,
    remove_songs: remove_songs,
    skip_songs: skip_songs,
    shuffle_queue: shuffle_queue,
    resetStatus: resetStatus,
    nowPlaying: getNowPlayingData,
    loopSetting: loopSetting,
    pause: pauseStream,
    resume: resumeStream,
}
