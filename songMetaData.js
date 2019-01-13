/**
 * @property {id, titile, channel, duration, requester, videoUrl, thumbnailUrl}
 */
class SongMetaData
{
  constructor(id, name, channel, dur, req, vUrl, tUrl)
  {
    this._id = id;
    this._name = name;
    this._channel = channel;
    this._duration = dur;
    this._requester = req;
    this._vidUrl = vUrl;
    this._thumbUrl = tUrl;
  }
  /**
   * @type {string}
   */
  get id() { return this._id; }
  /**
   * @type {string}
   */
  get title() { return this._name; }
  /**
   * @type {string}
   */
  get channel() { return this._channel; }
  /**
   * @type {string, miliseconds}
   */
  get duration() { return this._duration; }
  /**
   * @type {string}
   */
  get requester() { return this._requester; }
  /**
   * @type {string}
   */
  get videoUrl() { return this._vidUrl; }
  /**
   * @type {string}
   */
  get thumbnailUrl() { return this._thumbUrl; } 
}

module.exports = SongMetaData;