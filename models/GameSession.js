'use strict';

const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  // roomCode: String,
  players: [String],
  stories: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Story' } ]
});
gameSessionSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;