'use strict';

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const cors = require('cors');
const morgan = require('morgan');

const chance = require('chance').Chance();
const bodyParser = require('body-parser');

const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');
const Story = require('./models/Story');
const GameSession = require('./models/GameSession');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());

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

app.post('/', (req, res, next) => {
  const { playerName } = req.body;
  console.log(playerName);
  const options = { length: 6, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
  const roomCode = chance.string(options);

  const newSession = {roomCode, players: { name: playerName}};

  GameSession.create(newSession)
    .then(result => {
      console.log(result);
      res
        .location(`${req.originalUrl}/${result.roomCode}`)
        .status(201)
        .json(result);
    });
});

app.get('/:roomCode', (req, res, next) => {
  console.log('============================== RoomCode Requested');
  const { roomCode } = req.params;
  console.log(roomCode);

  GameSession.findByRoom(roomCode)
    .then(session => {
      if (session) {
        console.log('line 66: ', session);
        return res.json(session);
      } else {
        return next();
      }
    })
    .catch(err => {
      next(err);
    });
});

// app.put('/:roomCode', (req, res, next) => {
//   console.log('============================== RoomCode UPDATING SESSION');
//   const { roomCode } = req.params;
//   console.log(roomCode);

//   /**
//    * TODO:
//    * Can probably delete this endpoint. Should be done via socket.
//    * 
//    * Need to work on setting up dynamic rooms and connection logic
//    *   for sockets. Try this one:
//    *   https://www.alxolr.com/articles/working-with-socket-io-dynamic-namespaces
//    */

// });

io.on('connection', function(socket) {
  console.log('Socket connected: ' + socket.id);

  // SEND INITIAL STORY DATA TO EACH CLIENT WHEN THEY CONNECT
  // PROBABLY SHOULD BE REMOVED ONCE ALL GAME CREATION/JOINING LOGIC IS DONE
  // Story.find()
  //   .then(stories => {
  //     console.log(stories);
  //     socket.emit('action', {
  //       type: 'ADD_STORIES',
  //       stories
  //     });
  //     console.log('ADD_STORIES action sent!');
  //   });

  // ACTION LISTENER/HANDLING
  socket.on('action', (action) => {
    switch(action.type) {
    case 'SERVER_HELLO':
      console.log('Got hello data!', action.data);
      io.emit('action', {type:'HELLO', data:'good day from the Server!'});
      break;
    case 'SERVER_JOIN_ROOM':
      console.log('========== Got SERVER_JOIN_ROOM action ==========');
      console.log('roomCode: ', action.roomCode);
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          console.log('joinRoom found a gameSession with completed: ', gameSession.completed);
          if (gameSession && !gameSession.completed) {
            socket.join(action.roomCode);
          } else {
            socket.emit('action', {
              type: 'JOIN_ROOM_ERROR',
              error: 'Unable to join room'
            });
          }
        })
        .catch(err => {
          console.error('JOIN_ROOM_ERROR: ', err);
          socket.emit('action', {
            type: 'JOIN_ROOM_ERROR',
            error: err
          });
        });
      break;
    case 'SERVER_JOIN_GAME':
      console.log('========== Got SERVER_JOIN_GAME action ==========');
      console.log('roomCode: ', action.roomCode);
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          console.log('gameSession: ', gameSession);
          if (gameSession && !gameSession.started) {
            const existingPlayer = gameSession.players.find(
              player => player.name === action.playerName
            );
            if (!existingPlayer) {
              gameSession.players.push({
                name: action.playerName
              });
            }
          }
          return gameSession.save();
        })
        .then(gameSession => {
          console.log('gameSession saved');
          // send full gameSession data to player
          socket.emit('action', {
            type: 'JOIN_GAME_SUCCESS',
            id: gameSession.id,
            roomCode: gameSession.roomCode,
            players: gameSession.players,
            started: gameSession.started,
            completed: gameSession.completed,
            stories: gameSession.stories
          });
          // send the updated players list to everyone else in the game
          socket.in(gameSession.roomCode).emit('action', {
            type: 'UPDATE_PLAYERS',
            players: gameSession.players
          });

        })
        .catch(err => {
          console.error('JOIN_GAME_ERROR: ', err);
          socket.emit('action', {
            type: 'JOIN_GAME_ERROR',
            error: err
          });
        });

      break;
    case 'SERVER_START_GAME':
      console.log('========== Got SERVER_START_GAME action ==========');
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          console.log(gameSession);
          if (gameSession) {
            console.log('add `passesTo` setting for each player');
            gameSession.players.forEach((player, index) => {
              const nextIndex = gameSession.players[index + 1] ? index + 1 : 0;
              console.log(nextIndex);
              console.log(player.name, ' passesTo: ', gameSession.players[nextIndex].name);
              player.passesTo = gameSession.players[nextIndex].name;
              console.log(player.passesTo);

              // create an empty story for each player so there's a storyId to pass around
              gameSession.stories.push({ creator: player.name });
            });
            gameSession.started = true;
          }
          return gameSession.save();
        })
        .then(gameSession => {
          console.log('players: *', gameSession.players);
          console.log('stories: *', gameSession.stories);
          if (gameSession && gameSession.started) {
            console.log('started game for roomCode: ', gameSession.roomCode);
            io.in(action.roomCode).emit('action', {
              type: 'START_GAME_SUCCESS',
              gameSession
            });
            gameSession.players.forEach(player => {
              io.in(gameSession.roomCode).emit('action', {
                type: 'ADD_INITIAL_PROMPT',
                receiver: player.name,
                storyId: gameSession.stories.find(story => story.creator === player.name).id,
                prompt: 'Add a sentence to start your story. The only limit is your imagination!'
              });
            });
          } else {
            console.log('unable to start game for roomCode: ', gameSession.roomcode);
            socket.emit('action', {
              type: 'START_GAME_ERROR',
              error: 'Unable to start game (else). Check your logic, Kyle!'
            });
          }
        })
        .catch(err => {
          console.log('unable to start game for roomCode: (catch)', action.roomcode);
          console.log('error: ', err);
          socket.emit('action', {
            type: 'START_GAME_ERROR',
            error: 'Unable to start game (catch). Check your logic, Kyle!'
          });
        });
      break;
    case 'SERVER_ADD_SENTENCE':
      console.log('========== Got Add Sentence action ==========');
      console.log('roomCode: ', action.roomCode);
      console.log('sentence: ', action.sentence);
      console.log('author: ', action.author);
      console.log('storyId: ', action.storyId);
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          console.log('gameSession: ', gameSession.roomCode);

          const updatingStory = gameSession.stories.find(story => story.id === action.storyId);
          console.log('updatingStory.id: ', updatingStory.id);
          updatingStory.sentences.push({
            author: action.author,
            text: action.sentence
          });

          // set story as 'completed' if it has reached the max allowed length
          if (updatingStory.sentences.length === updatingStory.completionLength) {
            updatingStory.completed = true;
          }
          // set game as 'completed' if there are no unfinished stories
          const unfinished = gameSession.stories.find(story => !story.completed);
          if (!unfinished) {
            gameSession.completed = true;
          }
          return gameSession.save();
        })
        .then(savedGame => {
          console.log('updatedGame: ', savedGame);
          const updatedStory = savedGame.stories.find(story => story.id === action.storyId);
          console.log('updatedStory: ', updatedStory);
          const lastSentence = updatedStory.sentences[updatedStory.sentences.length - 1];
          io.in(savedGame.roomCode).emit('action', {
            type: 'ADD_SENTENCE_SUCCESS',
            text: lastSentence.text,
            author: lastSentence.author,
            id: lastSentence.id,
            storyId: updatedStory.id
          });
          console.log('ADD_SENTENCE_SUCCESS action sent!');
          
          if (!updatedStory.completed) {
            const incomingAuthor = savedGame.players.find(player => player.name === lastSentence.author);
            const addUpcomingPrompt = ({
              type: 'ADD_UPCOMING_PROMPT',
              storyId: updatedStory.id,
              prompt: lastSentence.text,
              receiver: incomingAuthor.passesTo
            });
            io.in(savedGame.roomCode).emit('action', addUpcomingPrompt);
            console.log('ADD_UPCOMING_PROMPT action sent!');
          }
          
          if (savedGame.completed) {
            const finishGame = ({
              type: 'FINISH_GAME',
              completed: savedGame.completed
            });
            io.in(savedGame.roomCode).emit('action', finishGame);
            console.log('FINISH_GAME action sent!');
          }

        })
        .catch(err => {
          console.log('error: ', err);
          // TODO: implement some sort of error handling here
        });
      break;
    }
  });

  // HANDLE DISCONNECTION
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

// TODO: grab error handling functions from older projects

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
