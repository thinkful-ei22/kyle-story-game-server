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
  completed: { type: Boolean, default: false },
  completionLength: { type: Number, default: 10 }
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

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;