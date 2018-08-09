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
  sentences: [sentenceSchema]
});
storySchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const Story = mongoose.model('Story', storySchema);

module.exports = Story;