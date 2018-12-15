const discord = require('discord.js');
const bot = new discord.Client({
  disabledEvents: ['TYPING_START', 'MESSAGE_REACTION_ADD', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'MESSAGE_REACTION_REMOVE'],
  disableEveryone: true
});
const musicQueue = require('./musicQueue.js');
const musicCommands = require('./musicCommands.js');
const utilCommands = require('./Utilities.js');
const prefix  = process.env.PREFIX;
const OwnerID = process.env.OWNER_ID;
const bot_token = process.env.BOT_TOKEN;
var queue = new musicQueue;
var leaveOnTimeOut = undefined;
console.log('Launching Yui-chan...');
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
    case 'clear': {
        if (leaveOnTimeOut !== undefined) {
          clearTimeout(leaveOnTimeOut);
          leaveOnTimeOut = undefined;
        }
        break;
      }
    case 'ignore': {
        break;
      }
    case 'leave': {
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
  switch (command) {
    case 'play': case 'p': {
      if (utilCommands.checkChannel(message, true)) {
        return musicCommands.play(message, queue, args);
      }
      break;
    }
    case 'pnext': case 'pn': {
      if (utilCommands.checkChannel(message, true)) {
        return musicCommands.addNext(message, queue, args);
      }
      break;
    }
    case 'skip' : case 'next': {
      if (utilCommands.checkChannel(message, false)) {
        if (queue.length() === 0) {
          return message.reply('Nothing is playing!');
        } else {
          return musicCommands.skip_songs(message, queue, args);
        }
      }
      break;
    }
    case 'join': case 'come': {
      if (utilCommands.checkChannel(message, true)) {
        return message.channel.send(" :loudspeaker: Kawaii **Yui-chan** is here~! xD");
      }
      break;
    }
    case 'leave' : case 'bye': {
      if (utilCommands.checkChannel(message, false)) {
        queue.deleteQueue();
        musicCommands.resetStatus();        
        utilCommands.resetStatus();
        message.member.voiceChannel.leave();
        return message.channel.send("**_Bye bye~! Matta nee~!_**");
      }
      break;
    }
    case 'np' : case 'nowplaying': {
      if (utilCommands.checkChannel(message, false)) {
        if (queue.length() === 0) {
          return message.reply('Nothing is playing!');
        } else {
          return musicCommands.nowPlaying(queue.songs[0], message, bot);
        }
      }
      break;
    }
    case 'queue': case 'q': {
      if (utilCommands.checkChannel(message, false)) {
        if (queue.isEmpty()) {
          return message.channel.send("There's nothing to play around here. How about adding something ?");
        } else {
          return musicCommands.check_queue(queue, message, args);
        }
      }
      break;
    }
    case 'pause': {
      if (utilCommands.checkChannel(message, false)) {
        return musicCommands.pause(message);
      }
      break;
    }
    case 'resume': {
      if (utilCommands.checkChannel(message, false)) {
        return musicCommands.resume(message);
      }
      break;
    }
    case 'stop': {
      if (utilCommands.checkChannel(message, false)) {
        if(!queue.isEmpty()) {
          queue.deleteQueue();
          musicCommands.resetStatus();
          return message.channel.send('**Stopped!**');
        }
        else { return message.channel.send("I'm not playing anything."); }
      }
      break;
    }
    case 'loop': {
      if (utilCommands.checkChannel(message, false)) {
        return musicCommands.loopSetting(message, args);
      }
      break;
    }
    case 'shuffle': {
        if (utilCommands.checkChannel(message, false)) {
          musicCommands.shuffle_queue(queue);
          return message.channel.send(':twisted_rightwards_arrows: **`QUEUE shuffled!`**');
        }
      break;
    }
    case 'remove': {
      if (utilCommands.checkChannel(message, false)) {
        return musicCommands.remove_songs(message, queue, args);
      }
      break;
    }
    case 'clear': {
       if (utilCommands.checkChannel(message, false)) {
         queue.clearQueue();
         return message.channel.send(":x: **Queue cleared!**");
       }
      break;
    }
    case 'search': {
      if (utilCommands.checkChannel(message, true)) {
        var query = args.join(" ");
        return musicCommands.search_list(query, queue, message);
      }
      break;
    }
    case 'autoplay': {
      if (utilCommands.checkChannel(message, true)) {
        musicCommands.autoPlay(message);
        if (!queue.isEmpty()) {
          return musicCommands.getChannelID_pl(queue.last()._id);
        } else {
          return message.channel.send("*Ok, now where do we start? How about you add something first? XD*");
        }
      }
      break;
    }
    case 'ping': {
      return utilCommands.getPing(message, bot);
    }
    case 'say': {
      return utilCommands.say(args, message);
    }
   case 'translate': {
      return utilCommands.translate(args, message, bot)
    }
    case 'tenor': {
      return utilCommands.tenorGIF(args, message);
    }
    case 'admin': {
      return utilCommands.adminCommands(message, args);
    }
    case 'help': {
      return utilCommands.help(message, bot);
    }
  }
});
