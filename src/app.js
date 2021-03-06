const express = require("express");
const path = require("path");
const app = express();
const WebSocket = require("ws");
const expressWs = require("express-ws")(app);
const http = require("http");
const tableNames = require("./constants/tableNames");
const knex = require("./db/config");
const block = require("./utils/block");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static(__dirname + "/public"));

let viewRouter = {
    "/": "index",
    "/offset": "offset",
    "/cursor": "cursor",
    "/cursor-ws": "cursor-ws",
};

for (const [key, value] of Object.entries(viewRouter)) {
    app.get(key, (req, res) => {
        res.sendFile(path.join(__dirname + `/views/${value}.html`));
    });
}

// Offset-based Pagination
app.get("/v1/blocklist", async (req, res) => {
    let page = req.query.page;
    let pageSize = req.query.pageSize;

    const blocks = await knex(tableNames.block)
        .orderBy("height", "desc")
        .offset((page - 1) * pageSize)
        .limit(pageSize);
    const [{ totalCount }] = await knex(tableNames.block).count("height", {
        as: "totalCount",
    });
    res.json({
        blocks: blocks,
        totalCount,
    });
});

// Cursor-based Pagination
app.get("/v2/blocklist", async (req, res) => {
    let limit = req.query.limit;
    let before = req.query.before;
    let after = req.query.after;

    if (before && after) {
        res.json({
            code: 1000001,
            message: "before and after don't simultaneously exist",
        });
        return;
    }

    let blocks;
    let hasPrev = true;
    let hasNext = true;
    if (!before && !after) {
        blocks = await knex(tableNames.block)
            .orderBy("height", "desc")
            .limit(limit);
    } else if (before) {
        blocks = await knex(tableNames.block)
            .where("height", ">", before)
            .orderBy("height", "asc")
            .limit(limit);
        blocks = blocks.reverse();

        // Generate Block Data When pull lastest data
        await block.triggerCreateBlockInDevelopment();
    } else {
        blocks = await knex(tableNames.block)
            .where("height", "<", after)
            .orderBy("height", "desc")
            .limit(limit);
    }

    if (blocks.length && blocks[blocks.length - 1].height === 0) {
        hasNext = false;
    }

    res.json({
        blocks: blocks,
        hasPrev,
        hasNext,
    });
});

app.ws("/blocks", function (ws, req) {

    triggerSetInterval.runInterval();

    ws.on("close", function () {
        console.log("close");
        triggerSetInterval.closeInterval();
    });
});

let aWss = expressWs.getWss("/blocks");
let triggerSetInterval = (function () {
    let intervalID;
    return {
        runInterval: function () {
            if (!intervalID) {
                intervalID = setInterval(async function () {
                    await block.triggerCreateBlockInDevelopment(1);
                    const blocks = await knex(tableNames.block)
                        .orderBy("height", "desc")
                        .limit(1);

                    aWss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(blocks));
                        }
                    });
                }, 1000);
            }
        },
        closeInterval: function () {
            clearInterval(intervalID);
            intervalID = null;
        },
    };
})();

module.exports = app;
