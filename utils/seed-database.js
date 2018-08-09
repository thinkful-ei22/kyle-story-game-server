'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const GameSession = require('../models/GameSession');
const Story = require('../models/Story');

const seedGameSession = require('../db/seed/gameSession');
const seedStories = require('../db/seed/stories');

console.log(`Connecting to mongodb at ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.info('Dropping Database');
    return mongoose.connection.db.dropDatabase();
  })
  .then(() => {
    console.info('Seeding Database');
    return Promise.all([
      Story.insertMany(seedStories),
      GameSession.insertMany(seedGameSession)
    ]);
  })
  .then(([storyResults, gameResults]) => {
    console.info(`Inserted ${storyResults.length} Stories`);
    console.info(`Inserted ${gameResults.length} GameSessions`);
  })
  .then(() => {
    console.info('Disconnecting');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
