# What's the Story?

Find the [server repo here](https://github.com/thinkful-ei22/kyle-story-game-server).
Find the [client repo here](https://github.com/thinkful-ei22/kyle-story-game-client).<br>
You can [play the game here](https://whats-the-story.netlify.com/) with your friends or teammates.

## About

_What's the Story?_ is a hilarious multiplayer game that's best described as a cross between _Mad Libs_ and _Telephone_ where players create collaborative stories written one sentence at a time.

### The Twist

Each player can only see the latest sentence of the story!

### Gameplay

- From the Home screen, players can choose to either:
  - Start a new game where they will be given a randomly generated Room Code to share with other players.
  - Join an existing game by entering a Room Code generated by someone else.
- Once all players have joined, the Start Game button allows players to, well... Start the Game!
- After submitting an inital sentence, each story is passed to the next player.
- Play continues with each player adding a sentence to the story based on only the preceding sentence without further context.
- The game ends when each story reaches a predetermined length (measured in number of sentences).
- Players can then select and read all the stories created during the game.

### Winning

_What's the Story?_ is a collaborative game emphasizing creativity and originality. As such, there is no "winner", _per se_. Players win _together_ to the extent that they use their creativity to come up with interesting stories.

## Tech Stack

The tech stack for this project includes:

- `Node.js` server
- `Express` for route handling
- `MongoDB`/`Mongoose` for the persistence layer
- `Socket.IO` for real-time multiplayer communication with game clients
- `React` frontend with `Redux` for state management
- `Chance.js` for generating random names and Room Codes
- `Mocha/Chai` for backend testing
- `Enzyme/Jest` for frontend testing
