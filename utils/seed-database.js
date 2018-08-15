'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const GameSession = require('../models/GameSession');

const seedGameSession = require('../db/seed/gameSession');

console.log(`Connecting to mongodb at ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.info('Dropping Database');
    return mongoose.connection.db.dropDatabase();
  })
  .then(() => {
    console.info('Seeding Database');
    return GameSession.insertMany(seedGameSession);
  })
  .then(results => {
    console.info(`Inserted ${results.length} GameSessions`);
  })
  .then(() => {
    console.info('Disconnecting');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
