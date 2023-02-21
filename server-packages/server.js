// The DuckPM server is specified in duckpm-global-config.json file.
// For example: "serverLocation": "http://localhost:3000/quack/"
// You'll need Express and Body-Parser for this server to work. Use npm install express body-parser.
const zlib = require('zlib');
const express = require('express');
const fs = require("fs");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true, limit: "64mb" }));
let concatservers = [];
let adminTokens = [
	require("crypto").randomBytes(8).toString("hex")
];
console.log("The admin tokens are:", adminTokens.join("; "), " (store this securely!)");
let userTokens = [
	require("crypto").randomBytes(4).toString("hex")
];
console.log("The user tokens are:", userTokens.join("; "), " (users can post packages)");
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
async function handleFolders(path, objects) {
	if (!path) return "";
	try {
		fs.mkdirSync(path);
	} catch {}
	for (let object in objects) {
		if (typeof objects[object] == "object") {
			await handleFolders(`${path}/${object}`, objects[object]);
		} else {
			fs.writeFileSync(`${path}/${object}`, objects[object]);
		}
	}
	return path;
}

app.get('/', (req, res) => {
	res.send(`This is a DuckPM server.<br>DuckPM has no GUI by default.<br>To use this server, edit your global DuckPM configuration file to use this server. Config is found in the same directory you installed DuckPM (not the packages!) with name <code>duckpm-global-config.json</code>. Edit this line:<br><code>\"serverLocation\": \"https://verylargecollectionof.unexistentpackages.com/quack/\"</code><br>to this line:<br><code>\"serverLocation\": \"${req.protocol}://${req.hostname}/quack/\"</code><br>Now try <code>duckpm update</code>. If it doesn't work, set the line to this instead:<br><code>\"serverLocation\": \"${req.protocol}://${req.hostname}:3000/quack/\"</code><br>If it still doesn't update the package cache, find out the server owner/admin and contact him.`);
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
			for (let pkg in list) {
				fulllist[pkg] = list[pkg];
			}
		}
	}
	let pkglist = fs.readdirSync("./index/");
	for (let pkg of pkglist) {
		fulllist[pkg] = fs.readdirSync(`${__dirname}/index/${pkg}/`);
	}
	res.json(fulllist);
});
app.get("/quack/get", async (req, res) => {
	if (!req.query.package) return res.status(400).send("Invalid request data");
	if (!req.query.version) return res.status(400).send("Invalid request data");
	if (!require("path").normalize(require("path").dirname(`${__dirname}/index/${req.query.package}/${req.query.version}/`)).startsWith(`${__dirname}/index/`)) return res.status(400).send("Attempt to manipulate server");
	let a = fs.existsSync(`${__dirname}/index/${req.query.package}/${req.query.version}/`);
	if (a) {
		let concat = await createFS(`${__dirname}/index/${req.query.package}/${req.query.version}`);
		let manifest = JSON.parse(concat["manifest.json"] || "{}");
		delete concat["manifest.json"];
		let endManifest = { ...manifest, files: concat };
		res.send(zlib.deflateSync(Buffer.from(JSON.stringify(endManifest))));
	} else {
		if (concatservers.length) {
			for (let concatsrv of concatservers) {
				let list = await fetch(`${concatsrv.endsWith("/") ? concatsrv : `${concatsrv}/`}get?package=${encodeURIComponent(req.query.package)}&version=${encodeURIComponent(req.query.version)}`);
				if (!list.ok) continue;
				return res.send(Buffer.from(new Uint8Array(await list.arrayBuffer())));
			}
			res.status(404).send("Invalid request: specified package wasn't found.");
		} else {
			res.status(404).send("Invalid request: specified package wasn't found.");
		}
	}
});
app.post("/quack/setpkg", async (req, res) => {
	if (!req.body.package) return res.status(400).send("Invalid request data");
	if (!req.body.version) return res.status(400).send("Invalid request data");
	if (!req.body.token) return res.status(400).send("Invalid request data");
	if (!require("path").normalize(require("path").dirname(`${__dirname}/index/${req.body.package}/${req.body.version}/`)).startsWith(`${__dirname}/index/`)) return res.status(400).send("Attempt to manipulate server");
	if (!userTokens.includes(req.body.token) && !adminTokens.includes(req.body.token)) return res.status(401).send("Invalid token");
	let pkg = req.body.pkgmeta;
	try {
		pkg = zlib.inflateSync(Buffer.from(pkg, "hex")).toString();
		pkg = JSON.parse(pkg);
	} catch {
		return res.status(500).send("Failed parse of package metadata");
	}
	if (!adminTokens.includes(req.body.token) && fs.existsSync(`${__dirname}/index/${req.body.package}`)) return res.status(400).send("Package already exists.");
	pkg.files = pkg.files || {};
	handleFolders(`${__dirname}/index/${req.body.package}`, {
		[ req.body.version ]: pkg.files
	});
	delete pkg.files;
	fs.writeFileSync(`${__dirname}/index/${req.body.package}/${req.body.version}/manifest.json`, JSON.stringify(pkg, null, "\t"));
	res.send("Ok, it's done!");
});
app.post("/quack/rmpkg", async (req, res) => {
	if (!req.body.package) return res.status(400).send("Invalid request data");
	if (!req.body.token) return res.status(400).send("Invalid request data");
	if (!require("path").normalize(require("path").dirname(`${__dirname}/index/${req.body.package}`)).startsWith(`${__dirname}/index`)) return res.status(400).send("Attempt to manipulate server");
	if (!adminTokens.includes(req.body.token)) return res.status(401).send("Invalid token");
	if (!fs.existsSync(`${__dirname}/index/${req.body.package || "a"}`)) return res.status(404).send("Package does not exist.");
	if (req.body.version && !fs.existsSync(`${__dirname}/index/${req.body.package || "a"}/${req.body.version || "0.0.1"}`)) return res.status(404).send("Package version does not exist.");
	if (req.body.version) {
		fs.rmSync(`${__dirname}/index/${req.body.package || "a"}/${req.body.version}`, {recursive: true, force: true});
	} else {
		fs.rmSync(`${__dirname}/index/${req.body.package || "a"}`, {recursive: true, force: true});
	}
	res.send("Ok, it's done!");
});

app.listen(3000, () => {
	console.log(`Example app listening on port 3000`);
});