const discord = require('discord.js');
const bot = new discord.Client({
  disabledEvents: ['TYPING_START', 'MESSAGE_REACTION_ADD', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'MESSAGE_REACTION_REMOVE'],
  disableEveryone: true,
});
const fs = require('fs');
const musicCommands = require('./musicCommands.js');
const utilCommands = require('./Utilities.js');
// const ytapikey = process.env.YT_API_KEY;
// const prefix  = process.env.PREFIX;
// const OwnerID = process.env.OWNER_ID;
// const bot_token = process.env.BOT_TOKEN;
// const tenor_key = process.env.TENOR_KEY;
// const anon_id = process.env.ANON_ID;
var config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const prefix = config.prefix;
const bot_token = config.token;
var leaveOnTimeOut = undefined;
console.log('Launching Yui-chan...')
bot.on('ready', () => {
  console.log('Yui is online!');
  //console.log();
  bot.user.setActivity('📻 Radio Happy', {
    url: 'https://twitch.tv/onlypolaris',
    type: 'STREAMING',
  });
});

bot.login(bot_token);

bot.on('voiceStateUpdate', (oldMem, newMem) => {
  switch (musicCommands.checkOnLeave(oldMem, newMem)) {
    case 'clear': {
        if (leaveOnTimeOut) {
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
            musicCommands.leaveVC(oldMem);
          }, 30000);
        }
        break;
      }
  }
});
bot.on("message", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  var args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  switch (command) {
    case 'play': case 'p': {
      if (musicCommands.checkChannel(message, true)) {
        return musicCommands.play(bot, message, args);
      }
      break;
    }
    case 'pn': case 'pnext': {
      if (musicCommands.checkChannel(message, true)) {
        return musicCommands.addNext(bot, message, args);
      }
      break;
    }
    case 'skip' : case 'next': {
      if (musicCommands.checkChannel(message, false)) {
          return musicCommands.skip_songs(message, args);
      }
      break;
    }
    case 'join': case 'come': {
      if (musicCommands.checkChannel(message, true)) {
        return message.channel.send(" :loudspeaker: Kawaii **Yui-chan** is here~! xD");
      }
      break;
    }
    case 'leave' : case 'bye': {
      if (musicCommands.checkChannel(message, false)) {
        message.member.voiceChannel.leave(); 
        musicCommands.resetStatus(message.guild.id);
        musicCommands.resetChannelStat(message.guild.id)
        return message.channel.send("**_Bye bye~! Matta nee~!_**");
      }
      break;
    }
    case 'np' : case 'nowplaying': {
      if (musicCommands.checkChannel(message, false)) {
          return musicCommands.nowPlaying(message, bot);
      }
      break;
    }
    case 'queue': case 'q': {
      if (musicCommands.checkChannel(message, false)) {
          return musicCommands.check_queue(message, args);
      }
      break;
    }
    case 'pause': {
      if (musicCommands.checkChannel(message, false)) {
        return musicCommands.pause(message);
      }
      break;
    }
    case 'resume': {
      if (musicCommands.checkChannel(message, false)) {
        return musicCommands.resume(message);
      }
      break;
    }
    case 'stop': {
      if (musicCommands.checkChannel(message, false)) {
          musicCommands.stop(message);
          return message.channel.send('**Stopped!**');
      }
      break;
    }
    case 'loop': {
      if (musicCommands.checkChannel(message, false)) {
        return musicCommands.loopSetting(message, args);
      }
      break;
    }
    case 'shuffle': {
      if (musicCommands.checkChannel(message, false)) {
        musicCommands.shuffleQ(message);
      }
      break;
    }
    case 'remove': {
      if (musicCommands.checkChannel(message, false)) {
        return musicCommands.remove_songs(message, args);
      }
      break;
    }
    case 'clear': {      
      if (musicCommands.checkChannel(message, false)) {
        return musicCommands.clearQueue(message);
      }      
      break;
    }
    case 'search': {
      if (musicCommands.checkChannel(message, true)) {
        var query = args.join(" ");
        return musicCommands.search_list(bot, query, message);
      }
      break;
    }
    case 'autoplay': case 'ap': {
      if (musicCommands.checkChannel(message, true)) {
        musicCommands.autoPlay(message, bot);
      }
      break;
    }
    //end of music command batch
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
      message.delete().then(sent => {  
        utilCommands.adminCommands(sent, args);
      }).catch(err => {
        message.author.send("Something went wrong.");
        console.log(err);
      });
      break;
    }
    case 'help': {
      return utilCommands.help(message, bot);
    }
    default : {
      message.channel.send("What do you mean by `>" + command + "`? How about taking a look at `>help`?.");
      break;
    }
  }
});