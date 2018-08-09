'use strict';

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const cors = require('cors');
const morgan = require('morgan');

const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');
const Story = require('./models/Story');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
  })
);

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

app.get('/', (req, res) => {
  res.json('connected via http');
});

io.on('connection', function(socket) {
  console.log('Socket connected: ' + socket.id);

  // SEND INITIAL STORY DATA TO EACH CLIENT WHEN THEY CONNECT
  Story.find()
    .then(stories => {
      console.log(stories);
      socket.emit('action', {
        type: 'ADD_STORIES',
        stories
      });
      console.log('ADD_STORIES action sent!');
    });

  // ACTION LISTENER/HANDLING
  socket.on('action', (action) => {
    switch(action.type) {
    case 'SERVER_HELLO':
      console.log('Got hello data!', action.data);
      io.emit('action', {type:'MESSAGE', data:'good day from the Server!'});
      break;
    case 'SERVER_ADD_SENTENCE':
      console.log('========== Got Add Sentence action ==========');
      console.log('sentence: ', action.sentence);
      console.log('author: ', action.author);
      console.log('storyId: ', action.storyId);

      Story.findById(action.storyId)
        .then(story => {
          console.log('story: ', story);
          story.sentences.push({
            author: action.author,
            text: action.sentence
          });
      
          return story.save();
        })
        .then(savedData => {
          const lastSentence = savedData.sentences[savedData.sentences.length - 1];
          console.log('updatedStory: ', savedData);
          console.log('action', {
            type: 'ADD_SENTENCE',
            sentence: lastSentence.text,
            author: lastSentence.author,
            id: lastSentence.id,
            storyId: savedData.id
          });
          io.emit('action', {
            type: 'ADD_SENTENCE',
            sentence: lastSentence.text,
            author: lastSentence.author,
            id: lastSentence.id,
            storyId: savedData.id
          });
          console.log('ADD_SENTENCE action sent!');
        });
      break;
    }
  });

  // HANDLE DISCONNECTION
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

function runServer(port = PORT) {
  server
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
}

if (require.main === module) {
  dbConnect();
  runServer();
}

module.exports = { app };
