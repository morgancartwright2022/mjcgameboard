const gamestate = {
    name: "game",
    id: -1,
    boardSize: {rows: 0, cols: 0},
    chat: [],
    icons: [],
    colors: [],
    addChat: (text) => {
        gamestate.chat.push(text);
    },
    removeIcon: (x, y) => {
        gamestate.icons = gamestate.icons.filter(icon => icon.x !== x || icon.y !== y)
    },
    addIcon: (x, y, src) => {
        gamestate.removeIcon(x, y);
        gamestate.icons.push({x, y, src});
    },
    addIcons: (icons) => {
        icons.forEach(icon => gamestate.addIcon(icon.x, icon.y, icon.src));
    },
    newBoard: (rows, cols) => {
        gamestate.boardSize = {rows, cols};
    },
    removeColor: (x, y) => {
        gamestate.colors = gamestate.colors.filter(color => color.x !== x || color.y !== y)
    },
    addColor: (x, y, hex) => {
        gamestate.removeColor(x, y);
        gamestate.colors.push({x, y, hex});
    },
    addColors: (colors) => {
        colors.forEach(icon => gamestate.addColor(icon.x, icon.y, icon.hex))
    },
    setId: (id) => {
        gamestate.id = id
    },
    reset: () => {
        gamestate.chat = [];
        gamestate.boardSize = {rows: 0, cols: 0};
        gamestate.icons = [];
        gamestate.colors = [];
    },
    toJson: () => {
        return {
            "id": gamestate.id,
            "name": gamestate.name,
            "boardSize": gamestate.boardSize,
            "chat": gamestate.chat,
            "icons": gamestate.icons,
            "colors": gamestate.colors
        }
    }
}

exports.gamestate = gamestate;