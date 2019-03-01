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
  res.json('server connected via http');
});

app.post('/', (req, res, next) => {
  const { playerName } = req.body;
  const options = { length: 6, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
  const roomCode = chance.string(options);

  const newSession = {roomCode, players: { name: playerName}};

  GameSession.create(newSession)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.roomCode}`)
        .status(201)
        .json(result);
    });
});

io.on('connection', function(socket) {
  console.log('========== user connected ==========');

  // ACTION LISTENER/HANDLING
  socket.on('action', (action) => {
    switch(action.type) {
    case 'SERVER_JOIN_ROOM':
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
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
          socket.emit('action', {
            type: 'JOIN_ROOM_ERROR',
            error: 'Unable to join game. Check your code and try again.'
          });
        });
      break;
    case 'SERVER_JOIN_GAME':
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
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
          socket.emit('action', {
            type: 'JOIN_GAME_ERROR',
            error: 'Unable to join game. Check your code and try again.'
          });
        });

      break;
    case 'SERVER_START_GAME':
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          if (gameSession) {
            // add `passesTo` setting for each player
            gameSession.players.forEach((player, index) => {
              const nextIndex = gameSession.players[index + 1] ? index + 1 : 0;
              player.passesTo = gameSession.players[nextIndex].name;

              // create an empty story for each player so there's a storyId to pass around
              gameSession.stories.push({ creator: player.name });
            });
            gameSession.started = true;
          }
          return gameSession.save();
        })
        .then(gameSession => {
          if (gameSession && gameSession.started) {
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
            socket.emit('action', {
              type: 'START_GAME_ERROR',
              error: 'Unable to start game (else). Check your logic, Kyle!'
            });
          }
        })
        .catch(err => {
          socket.emit('action', {
            type: 'START_GAME_ERROR',
            error: 'Unable to start game (catch). Check your logic, Kyle!'
          });
        });
      break;
    case 'SERVER_ADD_SENTENCE':
      GameSession.findByRoom(action.roomCode)
        .then(gameSession => {
          const updatingStory = gameSession.stories.find(story => story.id === action.storyId);
          updatingStory.sentences.push({
            author: action.author,
            text: action.text
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
          const updatedStory = savedGame.stories.find(story => story.id === action.storyId);
          const lastSentence = updatedStory.sentences[updatedStory.sentences.length - 1];
          io.in(savedGame.roomCode).emit('action', {
            type: 'ADD_SENTENCE_SUCCESS',
            text: lastSentence.text,
            author: lastSentence.author,
            id: lastSentence.id,
            storyId: updatedStory.id
          });
          
          if (!updatedStory.completed) {
            const incomingAuthor = savedGame.players.find(player => player.name === lastSentence.author);
            const addUpcomingPrompt = ({
              type: 'ADD_UPCOMING_PROMPT',
              storyId: updatedStory.id,
              prompt: lastSentence.text,
              receiver: incomingAuthor.passesTo
            });
            io.in(savedGame.roomCode).emit('action', addUpcomingPrompt);
          }
          
          if (savedGame.completed) {
            const finishGame = ({
              type: 'FINISH_GAME',
              completed: savedGame.completed
            });
            io.in(savedGame.roomCode).emit('action', finishGame);
          }

        })
        .catch(err => {
          socket.emit('action', {
            type: 'ADD_SENTENCE_ERROR',
            error: 'Unable to add sentence. Weird.'
          });
        });
      break;
    }
  });

  // HANDLE DISCONNECTION
  socket.on('disconnect', function() {
    console.log('========== user disconnected ==========');
    // TODO: remove user from game on disconnect
    //   maybe just set their `inSession` flag to `false`?
    //   will need to filter names to send to clients
    //   and probably re-adjust 'passesTo' if that has been set...
  });
});

// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    res.status(500).json({ message: 'Internal Server Error' });
  }
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
