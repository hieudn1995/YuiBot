# Yui-chanBOT
NodeJS Discord bot with playing music ability and ultilities for administration and entertaining
const prefix: '>'
Music commands: 
  join {alias: come},
  play {alias: p} <arguments/youtube song link/playlist link/live stream>,
  search <arguments>,
  skip {alias: next} (<index>),
  leave {alias: bye},
  pause,
  resume,
  remove <position> (<number of songs>),
  clear,
  stop,
  queue (<table index: check queue>/<loop: queue looping>),
  loop,
  shuffle,
  autoplay (require a start point (song, playlist,...))
Ultilities commands:
  admin <action> <@mention>,
  tenor <arguments, ?@mention>
  say <arguments>,
  ping
Some abilities:
  Auto leave voice channel when there's no one around (count down: 30 sec)
  Lock to channel when playing.
  
