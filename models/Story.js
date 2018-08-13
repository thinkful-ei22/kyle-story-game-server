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
  completionLength: { type: Number, default: 10 }
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

const Story = mongoose.model('Story', storySchema);

module.exports = Story;