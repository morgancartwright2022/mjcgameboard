const gamestate = {
    name: "game",
    boardSize: {rows: 0, cols: 0},
    chat: [],
    icons: [],
    colors: [],
    addChat: (text) => {gamestate.chat.push(text)},
    addIcon: (x, y, src) => gamestate.icons.push({x, y, src}),
    removeIcon: (x, y) => gamestate.icons = gamestate.icons.filter(icon => icon.x !== x || icon.y !== y),
    newBoard: (rows, cols) => gamestate.boardSize = {rows, cols},
    addColor: (x, y, hex) => gamestate.colors.push({x, y, hex}),
    toJson: () => {
        return {
            "name": gamestate.name,
            "boardSize": gamestate.boardSize,
            "chat": gamestate.chat,
            "icons": gamestate.icons,
            "colors": gamestate.colors
        }
    }
}

exports.gamestate = gamestate;