const express = require("express");
const http = require("http");
const { receiveMessageOnPort } = require("worker_threads");
const WebSocket = require("ws");
const gamestate = require("./gamestate.js").gamestate;
const DatabaseConnector = require("./gamestate.js").DatabaseConnector;
const { Client } = require('pg');

const port = process.env.PORT || 3000;

const server = http.createServer(express);
const wss = new WebSocket.Server({server});

/*
 * Connect to our database
 */

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

dbClient.connect();

// SQL Objects
const sqlUser = {
  fetchAll: callback => {
    dbClient.query('SELECT username FROM users', (err, res) => {
      if(err) console.log(err);
      else callback(res.rows);
    });
  }
}

const sqlBoard = {
  fetchBoard: (boardId, callback) => {
    dbClient.query('SELECT * FROM boards WHERE boardId = ' + boardId, (err, res) => {
      if(err) console.log(err);
      else callback(res.rows[0]);
    });
  },
  newBoard: (rows, cols, callback) => {
    dbClient.query(`INSERT INTO boards (rows, cols) ` + 
                   `VALUES (${rows}, ${cols})`, (err, res) => {
      if(err) console.log(err);
      else {
        if(callback) {
          dbClient.query("SELECT currval(pg_get_serial_sequence('boards', 'boardid'))", (err, res) => {
            if(err) console.log(err);
            else {
              callback(res.rows[0].currval);
            }
          });
        };
      }
    });
  }
}

const sqlIcon = {
  fetchIcons: (boardId, callback) => {
    dbClient.query('SELECT * FROM icons WHERE boardId = ' + boardId, (err, res) => {
      if(err) console.log(err);
      else callback(res.rows);
    });
  },
  saveIcons: (boardId, icons, callback) => {
    dbClient.query('DELETE FROM icons WHERE boardId = ' + boardId, (err) => {
      if(err) console.log(err);
      else {
        let success = true;
        icons.forEach(icon => {
          dbClient.query(`INSERT INTO icons (boardId, x, y, src) ` +
                         `VALUES (${boardId}, ${icon.x}, ${icon.y}, '${icon.src}')`, (err) => {
            if(err) {
              console.log(err);
              success = false;
            }
          });
        });
        if(callback)
          callback(success);
      }
    });
  }
}

const sqlColor = {
  fetchColors: (boardId, callback) => {
    dbClient.query("SELECT * FROM colors WHERE boardId = " + boardId, (err, res) => {
      if(err) console.log(err);
      else callback(res.rows);
    });
  },
  saveColors: (boardId, colors, callback) => {
    dbClient.query('DELETE FROM colors WHERE boardId = ' + boardId, (err) => {
      if(err) console.log(err);
      else {
        let success = true;
        colors.forEach(color => {
          dbClient.query(`INSERT INTO colors (boardId, x, y, hex) ` +
                         `VALUES (${boardId}, ${color.x}, ${color.y}, '${color.hex}')`, (err) => {
            if(err) {
              console.log(err);
              success = false;
            }
          });
        });
        if(callback)
          callback(success);
      }
    });
  }
}

/*
 * Save a board
 */
function saveBoard() {
  sqlIcon.saveIcons(gamestate.id, gamestate.icons);
  sqlColor.saveColors(gamestate.id, gamestate.colors);
}

/*
 * Handle incoming messages
 */
function receiveMessage(message, sender, allClients) {
  // Get the message data
  const {type, params} = message;

  // Perform action based on type of message
  switch(type) {
      case "chat":
          gamestate.addChat(params.text);
          break;
      case "addIcon":
          gamestate.addIcon(params.x, params.y, params.src);
          break;
      case "removeIcon":
          gamestate.removeIcon(params.x, params.y);
          break;
      case "newBoard":
          gamestate.reset();
          sqlBoard.newBoard(params.rows, params.cols, (boardId) => {
            gamestate.newBoard(params.rows, params.cols);
            gamestate.setId(boardId);
            sendMessage(sender, "chat", {text: "Server: New board created, ID = " + boardId + "."});
            allClients.forEach(client => {
              sendMessage(client, "newBoard", {boardId: boardId, rows: params.rows, cols: params.cols});
            });
          });
          break;
      case "addColor":
          gamestate.addColor(params.x, params.y, params.hex);
          break;
      case "ping":
          break;
      case "loadBoard":
        // Fetch everything
        const boardId = params.boardId;
        sqlBoard.fetchBoard(boardId, board => {
          sqlIcon.fetchIcons(boardId, icons => {
            sqlColor.fetchColors(boardId, colors => {
              // Add to board
              gamestate.reset();
              gamestate.newBoard(board.rows, board.cols);
              gamestate.addIcons(icons);
              gamestate.addColors(colors);
              gamestate.setId(boardId);

              allClients.forEach(client => {
                sendMessage(client, "serverData", {
                  gamestate: gamestate.toJson(),
                });
              })
            });
          });
        });
        break;
      case "saveBoard":
        // Save everything
        saveBoard();
        break;
      case "newClient":
        sendMessage(sender, "serverData", {
          gamestate: gamestate.toJson(),
        });
        break;
      default:
          console.log("Unexpected message type: " + type);
  }
}

/*
 * Send a message
 */
function sendMessage(client, type, params) {
  const message = {type, params};
  client.send(JSON.stringify(message));
}

/*
 * Set up web socket interactions
 */
wss.on('connection', ws => {
  // On connecting, look for messages
  ws.on('message', data => {
    // On receiving a message, convert it to a Java object
    const message = JSON.parse(data.toString());

    // Set up list of messages that don't redirect to client
    const serverMessageTypes = ["newClient", "ping", "newBoard", "loadBoard", "saveBoard"];

    // If this is not a server message, send it to the other clients
    if(!serverMessageTypes.includes(message.type)) {
      wss.clients.forEach(client => {
        if(client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      });
    }
    
    receiveMessage(message, ws, wss.clients);
  });
});

setInterval(() => {
  wss.clients.forEach(client => {
    const message = {
      type: "ping",
      params: {
        time: (new Date()).getTime
      }
    };
    client.send(JSON.stringify(message));
  });
}, 1000);

setInterval(() => saveBoard(), 10000);

server.listen(port, () => {
  console.log("Listening on port: " + port);
});