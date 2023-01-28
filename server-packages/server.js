// The DuckPM server is specified in duckpm-global-config.json file.
// For example: "serverLocation": "http://localhost:3000/quack/"
// You'll need Express for this server to work. Use npm install express.
const zlib = require('zlib');
const express = require('express');
const fs = require("fs");
const app = express();
let concatservers = []; //Specify servers to concatenate. The concatenated servers' index will be merged into this server and packages from them will be
						//made available. Some remote packages may get overriden.

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
app.get("/quack/list", async (req, res) => {
	let fulllist = {};
	if (concatservers.length) {
		for (let concatsrv of concatservers) {
			let list = await fetch(`${concatsrv.endsWith("/") ? concatsrv : `${concatsrv}/`}list`);
			list = await list.json();
			for (let pkg of list) {
				fulllist[pkg] = list[pkg];
			}
		}
	}
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
		if (concatservers.length) {
			for (let concatsrv of concatservers) {
				let list = await fetch(`${concatsrv.endsWith("/") ? concatsrv : `${concatsrv}/`}get?package=${encodeURIComponent(req.query.package)}&version=${encodeURIComponent(req.query.version)}`);
				if (!list.ok) continue;
				return res.send(await list.text());
			}
			res.status(404).send("Invalid request: specified package wasn't found.");
		} else {
			res.status(404).send("Invalid request: specified package wasn't found.");
		}
	}
});

app.listen(3000, () => {
	console.log(`Example app listening on port 3000`)
})