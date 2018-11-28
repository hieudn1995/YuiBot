const discord = require('discord.js');
const bot = new discord.Client({
  disabledEvents: ['TYPING_START', 'MESSAGE_REACTION_ADD', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'MESSAGE_REACTION_REMOVE'],
  disableEveryone: true
});
const fs = require('fs');
const musicQueue = require('./musicQueue.js');
const musicCommands = require('./musicCommands.js');
const utilCommands = require('./Utilities.js')
// const ytapikey = process.env.YT_API_KEY;
// const prefix  = process.env.PREFIX;
// const OwnerID = process.env.OWNER_ID;
// const bot_token = process.env.BOT_TOKEN;
// const tenor_key = process.env.TENOR_KEY;
// const anon_id = process.env.ANON_ID;
var config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const prefix = config.prefix;
const bot_token = config.token;
var queue = new musicQueue;
var leaveOnTimeOut = undefined;
console.log('Launching Yui-chan...')
bot.login(bot_token);
bot.on('ready', () => {
  console.log('Yui is online!');
  bot.user.setActivity('📻 Radio Happy', {
    url: 'https://twitch.tv/onlypolaris',
    type: 'STREAMING'
  });
});
bot.on('voiceStateUpdate', (oldMem, newMem) => {
  switch (utilCommands.checkOnLeave(oldMem, newMem)) {
    case 'clear':
      {
        if (leaveOnTimeOut !== undefined) {
          clearTimeout(leaveOnTimeOut);
          leaveOnTimeOut = undefined;
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
          leaveOnTimeOut = setTimeout(() => {
            if (musicCommands.isPlaying) {
              queue.deleteQueue();
              musicCommands.resetStatus();
            }
            utilCommands.leaveVC(oldMem);
          }, 30000);
        }
        break;
      }
  }
});
bot.on("message", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  var args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  if (command === 'play') {
    if (utilCommands.checkChannel(message, true)) {
      musicCommands.play(message, queue, args);
    }
  }
  if (command === "skip" || command === 'next') {
    if (utilCommands.checkChannel(message, false)) {
      if (queue.length() === 0) {
        return message.reply('Nothing is playing!');
      } else {
        musicCommands.skip_songs(message, queue, args);
      }
    }
  }
  if (command === "join" || command === "come") {
    if (utilCommands.checkChannel(message, true)) {
      message.member.voiceChannel.join();
      return message.channel.send(" :loudspeaker: Kawaii **Yui-chan** is here~! xD");
    }
  }
  if (command === "leave" || command === "bye") {
    if (utilCommands.checkChannel(message, false)) {
      musicCommands.resetStatus();
      queue.deleteQueue();
      utilCommands.resetStatus();
      message.member.voiceChannel.leave();
      return message.channel.send("**_Bye bye~! Matta nee~!_**");
    }
  }
  if (command === 'np') {
    if (utilCommands.checkChannel(message, false)) {
      if (queue.length() === 0) {
        message.reply('Nothing is playing!');
      } else {
        musicCommands.nowPlaying(queue.songs[0], message, bot);
      }
    }
  }
  if (command === 'queue') {
    if (utilCommands.checkChannel(message, false)) {
      if (queue.isEmpty()) {
        return message.channel.send("There's nothing to play around here. How about adding something ?");
      } else {
        return musicCommands.check_queue(queue, message, args);
      }
    }
  }
  if (command === "pause") {
    if (utilCommands.checkChannel(message, false)) {
      musicCommands.pause(message);
    }
  }
  if (command === "resume") {
    if (utilCommands.checkChannel(message, false)) {
      musicCommands.resume(message);
    }
  }
  if (command === "stop") {
    if (utilCommands.checkChannel(message, false)) {
      queue.deleteQueue();
      musicCommands.resetStatus();
      message.channel.send('**Stopped!**');
    }
  }
  if (command === 'loop') {
    if (utilCommands.checkChannel(message, false)) {
      musicCommands.loopSetting(message, args);
    }
  }
  if (command === 'shuffle') {
    if (message.member.voiceChannel) {
      if (utilCommands.checkChannel(message, false)) {
        musicCommands.shuffle_queue(queue);
        message.channel.send(':twisted_rightwards_arrows: **`QUEUE shuffled!`**');
      }
    }
  }
  if (command === 'remove') {
    if (utilCommands.checkChannel(message, false)) {
      musicCommands.remove_songs(message, queue, args);
    }

  }
  if (command === 'clear') {
    if (message.member.voiceChannel) {
      if (utilCommands.checkChannel(message, false)) {
        queue.clearQueue();
        return message.channel.send(":x: **Queue cleared!**");
      }
    }
  }
  if (command === 'search') {
    if (utilCommands.checkChannel(message, true)) {
      var query = args.join(" ");
      musicCommands.search_list(query, queue, message);
    }
  }
  if (command === 'autoplay') {
    if (utilCommands.checkChannel(message, true)) {
      musicCommands.autoPlay(message);
      if (!queue.isEmpty()) {
        musicCommands.getChannelID_pl(queue.last()._id);
      } else {
        message.channel.send("*Ok, now where do we start? How about you add something first? XD*");
      }
    }
  }
  if (command === 'ping') {
    utilCommands.getPing(message, bot);
  }
  if (command === 'say') {
    utilCommands.say(args, message);
  }
  if (command === 'translate') {
    utilCommands.translate(args, message)
  }
  if (command === '-') {
    utilCommands.tenorGIF(args, message, bot);
  }
  if (command === 'admin') {
    utilCommands.adminCommands(message, args);
  }
  if (command === 'help') {
    utilCommands.help(message, bot);
  }
});
// function isYtlink(str) {
//   if (typeof str === 'string') {
//     return (str.indexOf('youtube.com') >= 0) || (str.indexOf('youtu.be') >= 0);
//   } else return false;
// }
// function checkBoundChannel(message, voiceChannel, join) {
//   if (!boundVoiceChannel && join) {
//     boundVoiceChannel = voiceChannel.name;
//     boundTextChannel = message.channel.name;
//     message.channel.send("Bound to Text Channel: **`" + boundTextChannel + "`** and Voice Channel: **`" + boundVoiceChannel + "`**!");
//     return true;
//   } else {
//     if (message.channel.name !== boundTextChannel) {
//       return false;
//     } else {
//       if (voiceChannel.name !== boundVoiceChannel) {
//         return false;
//       } else return true;
//     }
//   }
// }
// async function tenor_gif(query, message) {
//   let num = await RNG(5);
//   let mention_user;
//   let des;
//   if (message.mentions.users.first()) {
//     mention_user = query.pop();
//     query = query.join(" ");
//     des = mention_user + ', you got a ' + query.toUpperCase() + " from " + message.author.toString();
//   } else {
//     query = query.join(" ");
//     des = message.author.toString() + ", you got " + query.toUpperCase();
//   }
//   request('https://api.tenor.com/v1/search?q=anime ' + query + '&key=' + tenor_key + '&limit=5&media_filter=basic&anon_id=' + anon_id, function (err, respond, body) {
//     if (err) return console.error(err);
//     var json = JSON.parse(body);
//     if (json.error) return console.error(json.error);
//     var embed = new discord.RichEmbed()
//       .setAuthor(bot.user.username, bot.user.avatarURL)
//       .setImage(json.results[num].media[0].gif.url)
//       .setColor(colorCodeYui)
//       .setDescription(des)
//     message.channel.send({
//       embed
//     });
//   });
// }

// function RNG(range) {
//   return Math.floor(Math.random() * range);
// }

// function translate(query, src_lang, des_lang, message) {
//   ggtrans(query, {
//     from: src_lang,
//     to: des_lang
//   }).then(res => {
//     message.channel.send({
//       embed: new discord.RichEmbed()
//         .setColor(colorCodeYui)
//         .setDescription(res.text)
//     });
//   }).catch(err => {
//     message.channel.send('Error. Translation failed!');
//     console.error(err);
//     return;
//   });
// }
// function administration_command(message, args) {
//   let ad_command = args.shift().toLowerCase();
//   if (message.guild.me.hasPermission(['BAN_MEMBERS', 'KICK_MEMBERS'])) {
//     if (ad_command === 'kick') {
//       let reason = args.join(' ');
//       let kickMem = message.mentions.members.first();
//       kickMem.kick(reason).then((mem) => {
//         message.channel.send(mem.user.username + ' has been kicked by ' + message.author.username);
//       });
//     }
//     if (ad_command === 'ban') {
//       let reason = args.join(' ');
//       let banMem = message.mentions.members.first();
//       banMem.ban(reason).then((mem) => {
//         message.channel.send(mem.user.username + ' has been banned by ' + message.author.username);
//       });
//     }
//   } else {
//     message.reply(" you don't have the required permissions to perform this action.");
//     return;
//   }
// }