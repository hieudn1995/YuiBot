const discord = require('discord.js');
const bot = new discord.Client({
  disabledEvents: ['TYPING_START', 'MESSAGE_REACTION_ADD', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'MESSAGE_REACTION_REMOVE'],
  disableEveryone: true,
});
const musicCommands = require('./musicCommands.js');
const utilCommands = require('./Utilities.js');

const prefix  = process.env.PREFIX;
const bot_token = process.env.BOT_TOKEN;

console.log('Launching Yui-chan...');

bot.on('ready', () => {
  console.log('Yui is online!');
  bot.user.setActivity('📻 Radio Happy', {
    url: 'https://twitch.tv/onlypolaris',
    type: 'STREAMING',
  });
});

bot.login(bot_token);

bot.on('voiceStateUpdate', (oldMem, newMem) => {
  musicCommands.guildVoiceStateUpdate(oldMem, newMem);
});

bot.on("message", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  var args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  switch (command) {
    case 'play': case 'p': {
      if (musicCommands.checkChannel(message, true)) {
          return musicCommands.play(message, args);
      }
      break;
    }
    case 'pn': case 'pnext': {
      if (musicCommands.checkChannel(message, true)) {
          return musicCommands.addNext(message, args);
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
          return musicCommands.stop(message);
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
        return musicCommands.searchSong(query, message);
      }
      break;
    }
    case 'autoplay': case 'ap': {
      if (musicCommands.checkChannel(message, true)) {
        musicCommands.autoPlay(message);
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
  }
});
