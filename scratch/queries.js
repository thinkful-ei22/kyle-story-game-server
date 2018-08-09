'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Story = require('../models/Story');

// ADD SENTENCE
const ADD_SENTENCE_ACTION = {
  sentence: 'This is the third sentence of story 3',
  author: 'nameOfPlayer2',
  storyId: '000000000000000000000002'
};

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    const id = ADD_SENTENCE_ACTION.storyId;

    return Story.findById(id);
  })
  .then(story => {
    console.log('story: ', story);
    story.sentences.push({
      author: ADD_SENTENCE_ACTION.author,
      text: ADD_SENTENCE_ACTION.sentence
    });

    return story.save();
  })
  .then(savedData => {
    console.log('updatedStory: ', savedData);
    console.log('action', {
      type: 'ADD_SENTENCE',
      sentence: savedData.sentences[savedData.sentences.length - 1].text,
      author: savedData.sentences[savedData.sentences.length - 1].author,
      storyId: savedData.id
    });
  })
  .then(() => {
    console.log('disconnecting');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });

/**
 * add a 'joinedAt' timestamp to the player data saved in the gameSession
 * 
 * have a query that returns a playersArray
 *   holding the players in the gameSession
 *   sorted by 'joinedAt' (<model>.statics?)
 * 
 * when a player submits a new sentence on a story,
 *   look up the player that submitted (action.author) in the playersArray
 *   and send the story to be added to the 'upcoming' queue
 *   for the next player in the array. if it's the last player,
 *   send it to the first player in the array
 * 
 * need a way to associate the player in the db with a particular socket
 *   maybe just send the message to everyone in the room
 *   and let the client handle the logic of only performing the action
 *   if action.name === playerName
 * 
 * How to switch components on frontend for the various screens?
 *   ReactRouter only works when hitting different urls?
 *   probably just use boolean flags for 'if (<flag>) render <Component>'
 *     will need to figure out what the flags will be
 *     and what will trigger them to flip?
 *   Jarod suggested using react-router-redux?
 * 
 */






