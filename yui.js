const discord = require('discord.js');
const bot = new discord.Client({
  disabledEvents: ['TYPING_START', 'MESSAGE_REACTION_ADD', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'MESSAGE_REACTION_REMOVE'],
  disableEveryone: true
});
const request = require('request');
const ggtrans = require('google-translate-api');
const musicQueue = require('./musicQueue.js');
const musicCommands = require('./musicCommands.js');

const prefix  = process.env.PREFIX;
const OwnerID = process.env.OWNER_ID;
const bot_token = process.env.BOT_TOKEN;
const tenor_key = process.env.TENOR_KEY;
const anon_id = process.env.ANON_ID;
const colorCodeYui = 'FFA000';

var queue = new musicQueue;

var boundVoiceChannel = null;
var boundTextChannel = null;
var leaveOnTimeOut = null;


console.log('Launching Yui-chan...')
bot.login(bot_token);
bot.on('ready', () => {
  console.log('Yui is online!');
  bot.user.setActivity('📻 Radio Happy', { url: 'https://twitch.tv/onlypolaris', type: 'STREAMING' });
});

bot.on('voiceStateUpdate', (oldMem, newMem) => {
  if (!boundVoiceChannel) return;
  let oldStat = oldMem.voiceChannel;
  let newStat = newMem.voiceChannel;
  if (newStat !== undefined) {
    if (leaveOnTimeOut !== null && newStat.name === boundVoiceChannel) {
      clearTimeout(leaveOnTimeOut);
      leaveOnTimeOut = null;
    }
  }
  if (!oldStat || (oldStat.name !== boundVoiceChannel)) return;
  else if (newStat === undefined || (newStat.name !== oldStat.name)) {
    if (oldStat.members.size === 1) {
      leaveOnTimeOut = setTimeout(() => {
        boundTextChannel = null;
        boundVoiceChannel = null;
        if (musicCommands.isPlaying) {
          queue.deleteQueue();
          musicCommands.resetStatus();
        }
        oldStat.leave();
      }, 30000);
    }
  }
});

bot.on("message", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  var args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  if (command === 'play') {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, true)) {
        args = args.join(" ");
        if (isYtlink(args) && args.indexOf('list=') > -1) {
          musicCommands.queuePlaylist(message, queue, args);
        }
        else {
          musicCommands.queueSong(message, queue, args);
        }
      }
      else {
        message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else {
      message.channel.send('You have to be in a voice channel to use this command!');
    }
  }
  if (command === "skip" || command === 'next') {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (queue.songs.length === 0) { message.reply('Nothing is playing!'); return; }
    if (checkBoundChannel(message, message.member.voiceChannel, false)) {
      musicCommands.skip_songs(message, queue, args);
    }
    else {
      message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      return;
    }
  }
  if (command === "join" || command === "come") {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, true)) {
        message.member.voiceChannel.join();
        message.channel.send(" :loudspeaker: Kawaii **Yui-chan** is here~! xD");
      }
      else {
        message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else { message.channel.send('Please join a voice channel!'); return; }
  }
  if (command === "leave" || command === "bye") {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (checkBoundChannel(message, message.member.voiceChannel, false)) {
      queue.deleteQueue();
      musicCommands.resetStatus();
      message.member.voiceChannel.leave();
      boundVoiceChannel = null;
      boundTextChannel = null;
      message.channel.send("*Bye bye~! Matta nee~!*");
    }
    else {
      message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
    }
  }
  if (command === 'np') {
    if (queue.length() === 0) {
      message.reply('Nothing is playing!');
    }
    else {
      musicCommands.nowPlaying(queue.songs[0], message, bot);
    }
  }
  if (command === 'queue') {
    if (queue.isEmpty()) {
      return message.channel.send("There's nothing to play around here. How about adding something ?");
    }
    else {
      return musicCommands.check_queue(queue, message, args);
    }
  }
  if (command === "pause") {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (!checkBoundChannel(message, message.member.voiceChannel, false)) {
      return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
    }
    musicCommands.pause(message);
  }
  if (command === "resume") {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (!checkBoundChannel(message, message.member.voiceChannel, false)) {
      return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
    }
    musicCommands.resume(message);
  }
  if (command === "stop") {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, false)) {
        queue.deleteQueue();
        musicCommands.resetStatus();
        message.channel.send('**Stopped!**');
      }
      else {
        message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
        return;
      }
    }
    else { message.channel.send('Please join a voice channel!'); return; }
  }
  if (command === 'loop') {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (!checkBoundChannel(message, message.member.voiceChannel, false)) {
      message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      return;
    }
    if (!args[0]) {
      if (!musicCommands.isLooping) {
        musicCommands.isLooping = true;
        message.channel.send(' :repeat: _**Loop enabled!**_');
      }
      else {
        musicCommands.isLooping = false;
        message.channel.send(' :twisted_rightwards_arrows: _**Loop disabled!**_');
      }
    }
    else if (args[0].toLowerCase() === 'queue') {
      if (!musicCommands.isQueueLooping) {
        musicCommands.isQueueLooping = true;
        message.channel.send(' :repeat: _**Queue loop enabled!**_');
      }
      else {
        musicCommands.isQueueLooping = false;
        message.channel.send(' :twisted_rightwards_arrows: _**Queue loop disabled!**_');
      }
    }
    else {
      message.channel.send('Invailid option, action aborted!');
      return;
    }
  }
  if (command === 'shuffle') {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, false)) {
        musicCommands.shuffle_queue(queue);
        message.channel.send('**`QUEUE shuffled!`**');
      }
      else {
        return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else {
      return message.channel.send('Please join a voice channel!');;
    }
  }
  if (command === 'remove') {
    if (!message.member.voiceChannel) { message.channel.send('Please join a voice channel!'); return; }
    if (!checkBoundChannel(message, message.member.voiceChannel, false)) {
      return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
    }
    else {
      return musicCommands.remove_songs(message, queue, args);
    }
  }
  if (command === 'clear') {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, true)) {
        queue.clearQueue();
        return message.channel.send('**QUEUE cleared!**');
      }
      else {
        return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else { return message.channel.send('Please join a voice channel!'); }
  }
  if (command === 'search') {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, true)) {
        var query = args.join(" ");
        musicCommands.search_list(query, queue, message);
      }
      else {
        message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else { message.channel.send('Please join a voice channel!'); return; }
  }
  if (command === 'autoplay') {
    if (message.member.voiceChannel) {
      if (checkBoundChannel(message, message.member.voiceChannel, true)) {
        if (!musicCommands.isAutoPlaying) {
          musicCommands.isAutoPlaying = true;
          if (!queue.isEmpty()) {
            musicCommands.getChannelID_pl(queue.last()._id);
          }
          return message.channel.send("**`📻 YUI's PABX MODE - ON! 🎶 - with you wherever you go.`**");
        }
        else {
          musicCommands.isAutoPlaying = false;
          return message.channel.send("**`📻 YUI's PABX MODE - OFF! 🎵`**");
        }
      }
      else {
        return message.channel.send("I'm playing at **`" + boundTextChannel + "`** - **`" + boundVoiceChannel + "`**");
      }
    }
    else {
      return message.channel.send('Please join a Voice Channel');
    }
  }
  if (command === 'ping') {
    var now = Date.now();
    message.channel.send('Pinging...').then((message) => {
      let diff = Date.now() - now;
      var t = '**```💻 ⇄ 🖥: ' + diff * 2 + 'ms```\n```🌸 ⇄ 🖥: ' + bot.pings[0] + 'ms```**';
      message.edit({
        embed: new discord.RichEmbed()
          .setColor(colorCodeYui)
          .setDescription(t)
      });
    });
  }
  if (command === 'say') {
    if (isMyOwner(message.author.id)) {
      args = args.join(" ");
      message.delete().then(message => { message.channel.send({
        embed:  new discord.RichEmbed()
        .setColor(colorCodeYui)
        .setDescription(args)
      }); });
    }
    else {
      message.delete().then(message => { message.author.send('Sorry but i will only speak for my Master.'); });
    }
  }
  if (command === 'translate') {
    args = args.join(".").toLowerCase().split(".");
    if (args[0] === 'code') {
      message.author.send("Here're the language codes required for translation",
        {
          embed: new discord.RichEmbed()
            .setAuthor('Language codes request', bot.user.avatarURL)
            .setColor(colorCodeYui)
            .setURL('https://cdn.discordapp.com/attachments/413313406993694728/456677126821773319/langcode.txt')
            .setTitle('Language Codes (.txt file)')
            .setDescription('To translate: type >translate <source language> <destination language> <your words(limit: 1000 words)>')
        });
    }
    else if (args.length < 3) {
      message.channel.send("Wrong format, use '>translate code' for more information.");
      return;
    }
    else {
      let scr = args.shift();
      let des = args.shift();
      let query = args.join(" ");
      translate(query, scr, des, message);
    }
  }
  if (command === '-') {
    tenor_gif(args, message);
  }
  if (command === 'admin') {
    administration_command(message, args);
  }
  if (command === 'help') {
    message.author.send("Here's my commands and info",
      {
        embed: new discord.RichEmbed()
          .setAuthor('Yui-chan', bot.user.avatarURL)
          .setColor(colorCodeYui)
          .setURL('https://cdn.discordapp.com/attachments/413313406993694728/463714313719513088/commandlist.txt')
          .setTitle("Yui's command list, just a .txt file")
          .setDescription("OHTSUKI YUI from THE IDOLM@STER CINDERELLA GIRLS: STARLIGHT STAGE. Yoroshiku nee~!!! XD")
      });
  }
});
function checkBoundChannel(message, voiceChannel, join) {
  if (!boundVoiceChannel && join) {
    boundVoiceChannel = voiceChannel.name;
    boundTextChannel = message.channel.name;
    message.channel.send("Bound to Text Channel: **`" + boundTextChannel + "`** and Voice Channel: **`" + boundVoiceChannel + "`**!");
    return true;
  }
  else {
    if (message.channel.name !== boundTextChannel) {
      return false;
    }
    else {
      if (voiceChannel.name !== boundVoiceChannel) {
        return false;
      }
      else return true;
    }
  }
}
async function tenor_gif(query, message) {
  let num = await RNG(5);
  let mention_user;
  let des;
  if (message.mentions.users.first()) {
    mention_user = query.pop();
    query = query.join(" ");
    des = mention_user + ', you got a ' + query.toUpperCase() + " from " + message.author.toString();
  }
  else {
    query = query.join(" ");
    des = message.author.toString() + ", you got " + query.toUpperCase();
  }
  request('https://api.tenor.com/v1/search?q=anime ' + query + '&key=' + tenor_key + '&limit=5&media_filter=basic&anon_id=' + anon_id, function (err, respond, body) {
    if (err) return console.error(err);
    var json = JSON.parse(body);
    if (json.error) return console.error(json.error);
    var embed = new discord.RichEmbed()
      .setAuthor(bot.user.username, bot.user.avatarURL)
      .setImage(json.results[num].media[0].gif.url)
      .setColor(colorCodeYui)
      .setDescription(des)
    message.channel.send({ embed });
  });
}
function RNG(range) {
  return Math.floor(Math.random() * range);
}
function translate(query, src_lang, des_lang, message) {
  ggtrans(query, { from: src_lang, to: des_lang }).then(res => {
    message.channel.send({
      embed: new discord.RichEmbed()
        .setColor(colorCodeYui)
        .setDescription(res.text)
    });
  }).catch(err => {
    message.channel.send('Error. Translation failed!');
    console.error(err);
    return;
  });
}
function administration_command(message, args) {
  let ad_command = args.shift().toLowerCase();
  if (message.guild.me.hasPermission(['BAN_MEMBERS', 'KICK_MEMBERS'])) {
    if (ad_command === 'kick') {
      let reason = args.join(' ');
      let kickMem = message.mentions.members.first();
      kickMem.kick(reason).then((mem) => {
        message.channel.send(mem.user.username + ' has been kicked by ' + message.author.username);
      });
    }
    if (ad_command === 'ban') {
      let reason = args.join(' ');
      let banMem = message.mentions.members.first();
      banMem.ban(reason).then((mem) => {
        message.channel.send(mem.user.username + ' has been banned by ' + message.author.username);
      });
    }
  }
  else {
    message.reply(" you don't have the required permissions to perform this action.");
    return;
  }
}
function isYtlink(str) {
  if (typeof str === 'string') {
    return (str.indexOf('youtube.com') >= 0) || (str.indexOf('youtu.be') >= 0);
  }
  else return false;
}
function isMyOwner(UserID) {
  return (UserID === '390348450690236416') || (UserID === '160745683727548416');
}
