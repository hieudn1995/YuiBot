
const SongMetaData = require('./songMetaData')
class musicQueue {
  constructor() {
    /**
     * @type {SongMetaData(id, name, channel, duration, req, vUrl, tUrl)}
     */
    this.songs = [];
  }
  /**
   * @returns {boolean}
   */
  isEmpty() {
    return (this.songs.length === 0);
  }
  /**
   * 
   * @param {SongMetaData} song 
   */
  addSong(song) {
    this.songs.push(song);
  }
  /**
   * 
   * @param {SongMetaData} song
   */
  addNext(song) {
    this.songs.splice(1, 0, song);
  }
  /**
   * @returns {SongMetaData}
   */
  shiftSong() {
      return this.songs.shift();
  }
  /**
   * 
   * @param {SongMetaData} currSong 
   */
  unshiftSong(currSong) {
    this.songs.unshift(currSong);
  }
  /**
   * 
   * @param {Number} index 
   * @returns {SongMetaData}
   */
  getAt(index) {
    return this.songs[index];
  }
  /**
   * @type {void}
   */
  deleteQueue() {
    this.songs = [];
  }
  /**
   * @type {void}
   */
  clearQueue() {
    let temp = this.songs.length - 1;
    this.songs.splice(1, temp);
  }
  /**
   * @returns {SongMetaData}
   */
  get last() {
    return this.songs[this.songs.length - 1];
  }
  totalDurLength() {
    let t = 0;
    for (var i = 0; i < this.songs.length; i++)
    {
      t = t + Number(this.songs[i].duration);
    }
    return t;
  }
  /**
   * @returns {Number}
   */
  get length() 
  {
     return this.songs.length;
  }
  popLast() {
    let t = this.songs[this.songs.length - 1].title
    this.songs.pop();
    return t;
  }
  /**
   * 
   * @param {Number} index 
   */
  spliceSong(index) {
    let tName = this.songs[index].title;
    this.songs.splice(index, 1);
    return tName;
  }
  /**
   * 
   * @param {Number} index 
   * @param {Number} length 
   */
  spliceSongs(index, length) {
    this.songs.splice(index, length);
  }
  swapData(i, j) {
    let temp = this.songs[i];
    this.songs[i] = this.songs[j];
    this.songs[j] = temp;
  }
  shuffle() {
    for (var i = this.length - 1; i > 1; i--) {
        let j = Math.floor(Math.random() * i) + 1;
        this.swapData(i, j);
    }
  }
}

module.exports = musicQueue;
