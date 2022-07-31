const express = require("express");
const http = require("http");
const { receiveMessageOnPort } = require("worker_threads");
const WebSocket = require("ws");
const gamestate = require("./gamestate.js").gamestate;

const port = process.env.PORT || 3000;

const server = http.createServer(express);
const wss = new WebSocket.Server({server});

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
        const message = {
            type: "serverData",
            params: {
              gamestate: gamestate.toJson()
            }
        }
        client.send(JSON.stringify(message));
        break;
      default:
          console.log("Unexpected message type: " + type);
  }
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
    if(message.type != "newClient") {
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