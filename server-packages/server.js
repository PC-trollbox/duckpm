// The DuckPM server is specified in duckpm-global-config.json file.
// For example: "serverLocation": "http://localhost:3000/quack/"
// You'll need Express for this server to work. Use npm install express.
const zlib = require('zlib');
const express = require('express');
const fs = require("fs");
const app = express();

async function createFS(path) {
    let fileSystem = {};
    let files1 = fs.readdirSync(path);
    for (let file of files1) {
        if (fs.lstatSync(`${path}/${file}`).isFile()) {
            fileSystem[file] = fs.readFileSync(`${path}/${file}`).toString();
        } else if (fs.lstatSync(`${path}/${file}`).isDirectory()) {
            fileSystem[file] = await createFS(`${path}/${file}`);
        }
    }
    return fileSystem;
}

app.get('/', (req, res) => {
	res.send("This server is used for DuckPM.");
});
app.get("/quack/", (req, res) => {
	res.status(400).send("Invalid request: must specify an action (list or get).");
});
app.get("/quack/list", (req, res) => {
	let fulllist = {};
	let pkglist = fs.readdirSync("./index/");
	for (let pkg of pkglist) {
		fulllist[pkg] = fs.readdirSync("./index/" + pkg + "/");
	}
	res.json(fulllist);
});
app.get("/quack/get", async (req, res) => {
	let a = fs.existsSync("./index/" + req.query.package + "/" + req.query.version + "/");
	if (a) {
		let concat = await createFS("./index/" + req.query.package + "/" + req.query.version);
		let manifest = JSON.parse(concat["manifest.json"] || "{}");
		delete concat["manifest.json"];
		let endManifest = { ...manifest, files: concat };
		res.send(zlib.deflateSync(Buffer.from(JSON.stringify(endManifest))));
	} else {
		res.end();
	}
});

app.listen(3000, () => {
	console.log(`Example app listening on port 3000`)
})