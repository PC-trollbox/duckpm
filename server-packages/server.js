// The DuckPM server is specified in duckpm-global-config.json file.
// For example: "serverLocation": "http://localhost:3000/quack/"
// You'll need Express for this server to work. Use npm install express.

const zlib = require('zlib');
const express = require('express');
const app = express();

let createdharmful = new Array(512);
createdharmful = createdharmful.fill("");
createdharmful = createdharmful.map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16));
console.log("Install this package to clutter up your cache:", createdharmful[0]);

app.get('/', (req, res) => {
    res.send("This server is used for DuckPM.");
});
app.get("/quack/", (req, res) => {
    res.status(400).send("Invalid request: must specify an action (list or get).");
});
app.get("/quack/list", (req, res) => {
    let myquack = {};
    for (let pkg of createdharmful) {
        myquack[pkg] = [ "0.0.1" ]
    }
    res.json({ simplepackage: [ "0.0.1", "1.0.0"], mypkgs: [ "0.0.1", "0.0.2" ], ...myquack });
});
app.get("/quack/get", (req, res) => {
    if (req.query.package == "simplepackage") {
        if (req.query.version == "0.0.1") {
            res.send(zlib.deflateSync(Buffer.from(JSON.stringify({
                "preinstall": "console.log('This package is about to get installed.');",
                "postinstall": "console.log('This package has been installed!');",
                "files": {
                    "c": "None for now."
                }
            }))));
        } else if (req.query.version == "1.0.0") {
            res.send(zlib.deflateSync(Buffer.from(JSON.stringify({
                "preinstall": "console.warn('This package is a beta version!');",
                "postinstall": "console.log('This package has been installed, phew...');",
                "preremove": "console.warn('You\\'re removing a beta version automatically. You should do it manually as there can be bugs in the uninstaller')",
                "postremove": "console.log('Phew, it still works...')",
                "files": {
                    "c": "#!/bin/bash\necho Hello!\necho This is a test program.\necho Testing dependency \\\"mypkgs\\\":\ncat dependency\nif [[ \"$?\" == \"0\" ]]; then echo \"Everything is fine. We still have consistency.\"; fi"
                },
                "programMaps": [
                    "c"
                ],
                "dependencies": [
                    "mypkgs@0.0.2"
                ]
            }))));
        } else {
            res.status(404).send("Invalid request: Package not found.");
        }
    } else if (req.query.package == "mypkgs") {
        if (req.query.version == "0.0.1") {
            res.send(zlib.deflateSync(Buffer.from(JSON.stringify({
                "files": {
                    "dependency": "This is a file loaded from dependency. Removing that might cause inconsistency with other programs."
                }
            }))));
        } else if (req.query.version == "0.0.2") {
            res.send(zlib.deflateSync(Buffer.from(JSON.stringify({
                "files": {
                    "dependency": "Hey there! You aren't removing me so you're good at keeping consistency."
                }
            }))));
        }
    } else if (createdharmful.includes(req.query.package)) {
        res.send(zlib.deflateSync(Buffer.from(JSON.stringify({
            "preinstall": "console.log('" + "a".repeat(512) + "');",
            "postinstall": "console.log('" + "a".repeat(512) + "');",
            "preremove": "console.log('" + "a".repeat(512) + "');",
            "postremove": "console.log('" + "a".repeat(512) + "');",
            "files": {
                [req.query.package]: "a".repeat(512)
            },
            "dependencies": createdharmful
        }))));
    } else {
        res.status(404).send("Invalid request: Package not found.");
    }
});

app.listen(3000, () => {
    console.log(`Example app listening on port 3000`)
})
