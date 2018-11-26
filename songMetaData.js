

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
}
module.exports = SongMetaData;