'use strict';

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  readyState: { type: Boolean, default: false },
  inSession: { type: Boolean, default: true }
});
playerSchema.set('timestamps', true);
playerSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const gameSessionSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  players: [playerSchema],
  stories: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Story' } ],
  started: { type: Boolean, default: false },
  completed: { type: Boolean, default: false }
  // when sentences are submitted, check the length of story.sentences
  //   if length is not less than story.completionLength,
  //   set the 'completed' flag to be true on the story
  // after a story has 'completed' set to 'true,
  //   check the 'completed' state of the other stories
  //   if there aren't any 'false' results, set `gameSession.completed = true`
});
gameSessionSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});
gameSessionSchema.statics.findByRoom = function(roomCode) {
  return this.findOne({ roomCode});
};
gameSessionSchema.statics.findByRoomAndUpdate = function(roomCode, updateObj) {
  return this.findOneAndUpdate({ roomCode }, updateObj, { new: true });
};

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;