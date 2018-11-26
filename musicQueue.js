

class musicQueue {
  constructor() {
    this.songs = [];
  }
  isEmpty() {
    return (this.songs.length === 0);
  }
  addSong(song) {
    this.songs.push(song);
  }
  shiftSong() {
      return this.songs.shift();
  }
  unshiftSong(currSong) {
    this.songs.unshift(currSong);
  }
  deleteQueue() {
    this.songs = [];
  }
  clearQueue() {
    let temp = this.songs.length - 1;
    this.songs.splice(1, temp);
  }
  last() {
    return this.songs[this.length() - 1];
  }
  totalDurLength() {
    let t = 0;
    for (var i = 0; i < this.songs.length; i++)
    {
      t = t + Number(this.songs[i]._duration);
    }
    return t;
  }
  length() 
  {
     return this.songs.length;
  }
  popLast() {
    let tName = this.songs[this.length - 1]._name
    this.songs.pop();
    return tName;
  }
  spliceSong(index) {
    let tName = this.songs[index]._name;
    this.songs.splice(index, 1);
    return tName;
  }
  spliceSongs(index, length) {
    this.songs.splice(index, length);
  }
}

module.exports = musicQueue;
