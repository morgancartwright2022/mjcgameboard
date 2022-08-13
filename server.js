const express = require("express");
const http = require("http");
const { receiveMessageOnPort } = require("worker_threads");
const WebSocket = require("ws");
const gamestate = require("./gamestate.js").gamestate;
const { Client } = require('pg');


const port = process.env.PORT || 3000;

const server = http.createServer(express);
const wss = new WebSocket.Server({server});

/*
 * Connect to our database
 */

const client = new Client({
  connectionString: process.env.DATABASE_URL || local,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();

client.query('SELECT username from users', (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
});

const SqlUser = {
  fetchAll: callback => {
    client.query('SELECT username FROM users', (err, res) => {
      if(err) console.log(err);
      else callback(res.rows);
    });
  }
}

/*
 * Handle incoming messages
 */
function receiveMessage(message, client) {
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
          gamestate.newBoard(params.rows, params.cols);
          break;
      case "addColor":
          gamestate.addColor(params.x, params.y, params.hex);
          break;
      case "ping":
          break;
      case "newClient":
        SqlUser.fetchAll(users => {
          sendMessage(client, "serverData", {
            gamestate: gamestate.toJson(),
            users: users
          });
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

    // If this is not a server message, send it to the other clients
    if(message.type != "newClient" && message.type != "ping") {
      wss.clients.forEach(client => {
        if(client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      });
    }
    
    receiveMessage(message, ws);
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

server.listen(port, () => {
  console.log("Listening on port: " + port);
});