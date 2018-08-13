'use strict';

const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  author: { type: String, required: true },
  text: { type: String, required: true }
});
sentenceSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const storySchema = new mongoose.Schema({
  creator: { type: String, required: true },
  sentences: [sentenceSchema],
  completed: { type: Boolean, default: false }, // needed? could just compute...
  completionLength: { type: Number, default: 3 }
  // when sentences are submitted, check the length of story.sentences
  // if length is not less than story.completionLength,
  // set the 'completed' flag to be true on the story
});
storySchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  readyState: { type: Boolean, default: false },
  inSession: { type: Boolean, default: true },
  passesTo: String
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
  stories: [storySchema],
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