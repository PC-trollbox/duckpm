const ver = "0.9.0";
const zlib = require('zlib');
const util = require("util");
const params = util.parseArgs({
	strict: false,
	allowPositionals: true
});
const fs = require("fs");
const os = require("os");
let config;
try {
	config = require("./duckpm-global-config.json");
} catch {
	config = {
		failedToLoad: true,
		allowOverrideByUser: false,
		serverLocation: "https://verylargecollectionof.unexistentpackages.com/quack/"
	}
}

if (params.values.quiet) {
	for (let fact in console) {
		if (typeof console[fact] === "function") {
			console[fact] = new Function();
		}
	}
}
if (!params.values.hideoem) {
	console.info("[inf] duckpm v" + ver);
	console.info("[inf] Made by PCsoft");
}
let userconfig = {};

function reloadUserConfig(quiet = false) {
	if (!config.failedToLoad) {
		try {
			userconfig = require(os.homedir() + "/.duckpm-local-config.json");
			for (let key in userconfig) {
				if (config.hasOwnProperty(key)) {
					if (config.allowOverrideByUser) {
						config[key] = userconfig[key];
					} else {
						if (!quiet) console.warn("[wrn] Attempted to use local config's \"" + key + "\" but already defined by global config!")
					}
				} else {
					config[key] = userconfig[key];
				}
			}
		} catch {
			config.failedToLoad = true;
			config.userFailedToLoad = true;
		}
	}
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
			if (process.platform == "linux" || process.platform == "android") fs.chmodSync(`${path}/${object}`, 493); // 755, mark as executable on Linux
		}
	}
	return path;
}
async function unhandleFolders(path, objects) {
	if (!path) return "";
	for (let object of objects) {
		if (typeof objects[object] == "object") {
			await unhandleFolders(`${path}/${object}`, objects[object]);
		} else {
			fs.rmSync(`${path}/${object}`, {
				recursive: true,
				force: true
			});
		}
	}
	return path;
}
async function handleSymlinks(path, links) {
	if (!path) return "";
	let allLinks = [];
	for (let object of links) {
		fs.symlinkSync(`${path}/${object}`, `${os.homedir()}/.local/bin/${object}`);
		allLinks.push(`${os.homedir()}/.local/bin/${object}`);
	}
	return allLinks;
}

function length(bytes) {
	let out = "";
	if ((bytes / 1024 / 1024 / 1024 / 1024) >= 1) out = out + Math.floor(bytes / 1024 / 1024 / 1024 / 1024) + " tb ";
	if ((bytes / 1024 / 1024 / 1024 % 1024) >= 1) out = out + Math.floor(bytes / 1024 / 1024 / 1024 % 1024) + " gb ";
	if ((bytes / 1024 / 1024 % 1024) >= 1) out = out + Math.floor(bytes / 1024 / 1024 % 1024 % 1024) + " mb ";
	if ((bytes / 1024 % 1024) >= 1) out = out + Math.floor(bytes / 1024 % 1024 % 1024 % 1024) + " kb ";
	if ((bytes % 1024) >= 1) out = out + Math.floor(bytes % 1024) + " b";
	return out.trim();
}
reloadUserConfig();
if (!params.values.hideoem) console.info("[inf] ");

(async function Core() {
	if (params.positionals[0] == "install" || params.positionals[0] == "i") {
		if (params.values.itself || ((params.positionals[1] == "duckpm@" + ver || params.positionals[1] == "duckpm") && !params.values.server)) {
			console.info("[inf] Installing \"duckpm@" + ver + "\" from local cache...");
			if (config.failedToLoad && !config.userFailedToLoad) {
				console.log("The new serverLocation will be set to https://verylargecollectionof.unexistentpackages.com/quack/.");
				console.log("The local config settings cannot modify global settings by default. Change allowOverrideByUser to allow that.")
				console.log("Installing global configs...");
				delete config.failedToLoad;
				fs.writeFileSync(__dirname + "/duckpm-global-config.json", JSON.stringify(config, null, "\t"));
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", "{}");
			} else if (config.userFailedToLoad) {
				console.log("Seems like the user config wasn't initialized. Let's do that.");
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", "{}");
			}
			console.info("[inf] \"duckpm\" installed successfully!");
		} else {
			if (config.failedToLoad) {
				console.warn("[wrn] Please install duckpm first with duckpm install duckpm!");
				console.info("[inf] If you still want to continue without duckpm installed, use --noconfig switch. It's dangerous!");
			}
			if (!params.values.noconfig && config.failedToLoad) return process.exit(1);
			installpkg(params.positionals[1]);
		}
	} else if (params.positionals[0] == "cachepkg") {
		console.info("[inf] Getting server package list...");
		let parsed = {
			package: params.positionals[1].split("@")[0],
			version: params.positionals[1].split("@")[1]
		};
		if (!config.packageList || config.failedToLoad) {
			packagelist = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "list");
			packagelist = await packagelist.json();
			if (!config.failedToLoad) {
				userconfig.packageList = packagelist;
				reloadUserConfig(true);
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
			}
		} else {
			packagelist = config.packageList;
			console.info("[inf] Using cached list, use duckpm update to update.")
		}
		if (!packagelist.hasOwnProperty(parsed.package)) {
			console.error("[err] Couldn't find \"" + (parsed.package || "") + "\" on the server.");
			return process.exit(1);
		}
		if (!packagelist[parsed.package].includes(parsed.version) && parsed.version) {
			console.error("[err] Couldn't find version \"" + parsed.version + "\" of package \"" + (parsed.package || "") + "\" on the server, however there are other versions available.");
			console.info("[inf] The available versions are: " + packagelist[parsed.package].join(", "));
			return process.exit(1);
		}
		console.info("[inf] Caching " + params.positionals[1] + "...");
		if (!config.failedToLoad) {
			if (!config.cachedpackages || config.failedToLoad) {
				let package;
				package = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "get?package=" + encodeURIComponent(parsed.package) + "&version=" + encodeURIComponent(parsed.version));
				package = await package.arrayBuffer();
				package = Buffer.from(new Uint8Array(package));
				if (!config.failedToLoad) {
					userconfig.cachedpackages = {};
					userconfig.cachedpackages[parsed.package + "@" + parsed.version] = package.toString("base64");
					reloadUserConfig(true);
					if (!params.values.noinstall) fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
				}
			} else if (!config.cachedpackages.hasOwnProperty(parsed.package + "@" + parsed.version)) {
				let package;
				package = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "get?package=" + encodeURIComponent(parsed.package) + "&version=" + encodeURIComponent(parsed.version));
				package = await package.arrayBuffer();
				package = Buffer.from(new Uint8Array(package));
				userconfig.cachedpackages[parsed.package + "@" + parsed.version] = package.toString("base64");
				reloadUserConfig(true);
				if (!params.values.noinstall) fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
			}
		}
		console.info("[inf] Cached successfully!");
	} else if (params.positionals[0] == "remove" || params.positionals[0] == "delete" || params.positionals[0] == "del" || params.positionals[0] == "rm" || params.positionals[0] == "uninstall") {
		if (params.values.itself) {
			console.info("[inf] Removing \"duckpm@" + ver + "\"...");
			if (config.failedToLoad) {
				console.log("No need to remove the config: couldn't load one.");
			} else {
				fs.rmSync(__dirname + "/duckpm-global-config.json");
				fs.rmSync(os.homedir() + "/.duckpm-local-config.json");
				console.log("The configs were removed.");
			}
			console.info("[inf] \"duckpm\" removed successfully!");
		} else {
			if (!userconfig.installed || config.failedToLoad) {
				console.error("[err] You haven't installed anything yet.");
				return process.exit(1);
			} else if (!userconfig.installed.hasOwnProperty(params.positionals[1])) {
				console.error("[err] Couldn't find \"" + params.positionals[1] + "\" on your computer. Make sure to specify the version of the software you're uninstalling.");
				return process.exit(1);
			} else {
				console.info("[inf] Removing \"" + params.positionals[1] + "\"...");
				eval(userconfig.installed[params.positionals[1]].removescripts.preremove);
				let files = userconfig.installed[params.positionals[1]].fs;
				if (!params.values.nofile) {
					if (userconfig.installed[params.positionals[1]].symlinks.length) {
						console.info("[inf] Removing symlinks...");
						for (let symlink of userconfig.installed[params.positionals[1]].symlinks) {
							fs.rmSync(symlink);
						}
					}
					console.info("[inf] Removing files...");
					await unhandleFolders(userconfig.installed[params.positionals[1]].path, files);
				} else {
					console.warn("[wrn] Following symlinks need to be removed: " + userconfig.installed[params.positionals[1]].symlinks.join(", "));
					console.warn("[wrn] Following files need to be removed:    " + userconfig.installed[params.positionals[1]].path + "/" + userconfig.installed[params.positionals[1]].fs.join(", " + userconfig.installed[params.positionals[1]].path + "/"));
				}
				console.info("[inf] Removing uninstallation information...");
				let postrem = userconfig.installed[params.positionals[1]].removescripts.postremove;
				delete userconfig.installed[params.positionals[1]];
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
				reloadUserConfig(true);
				eval(postrem);
				console.info("[inf] \"" + params.positionals[1] + "\" removed successfully!");
			}
		}
	} else if (params.positionals[0] == "update") {
		console.info("[inf] Getting server package list...");
		let packagelist;
		if (!config.failedToLoad) {
			packagelist = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "list");
			packagelist = await packagelist.json();
			if (!config.failedToLoad) {
				userconfig.packageList = packagelist;
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
			}
		}
		console.info("[inf] Update success!");
	} else if (params.positionals[0] == "clean") {
		console.info("[inf] Cleanup...");
		if (!config.failedToLoad) {
			delete userconfig.packageList;
			delete userconfig.cachedpackages;
			fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
		}
		console.info("[inf] Cleanup success!");
	} else if (params.positionals[0] == "cachesize") {
		console.info("[inf] Size of package list           :", length(Buffer.byteLength(JSON.stringify(userconfig.packageList || "", null, "\t"))));
		console.info("[inf] Size of cached packages        :", length(Buffer.byteLength(JSON.stringify(userconfig.cachedpackages || "", null, "\t"))));
		console.info("[inf] Size of installed packages     :", length(Buffer.byteLength(JSON.stringify(userconfig.installed || "", null, "\t"))));
		console.info("[inf] Total cache size               :", length(Buffer.byteLength(JSON.stringify(userconfig.packageList || "", null, "\t")) + Buffer.byteLength(JSON.stringify(userconfig.cachedpackages || "", null, "\t"))));
		console.info("[inf] Total cache size (+installed)  :", length(Buffer.byteLength(JSON.stringify(userconfig.packageList || "", null, "\t")) + Buffer.byteLength(JSON.stringify(userconfig.cachedpackages || "", null, "\t")) + Buffer.byteLength(JSON.stringify(userconfig.installed || "", null, "\t"))));
		console.info("[inf] Local config size              :", length(Buffer.byteLength(JSON.stringify(userconfig, null, "\t"))));
		console.info("[inf] Global config size (estimated) :", length(Buffer.byteLength(JSON.stringify(config, null, "\t")) - Buffer.byteLength(JSON.stringify(userconfig, null, "\t"))));
		console.info("[inf] Every config size              :", length(Buffer.byteLength(JSON.stringify(config, null, "\t"))));
	} else if (params.positionals[0] == "listpkg") {
		console.info("[inf] Installed package list (with versions):");
		for (let pkg in config.installed) {
			console.info("[inf] " + pkg + " - installed");
		}
	} else if (params.positionals[0] == "listonlpkg") {
		console.info("[inf] Online package list (with versions):");
		let packagelist;
		if (!config.packageList || config.failedToLoad) {
			packagelist = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "list");
			packagelist = await packagelist.json();
			if (!config.failedToLoad) {
				userconfig.packageList = packagelist;
				reloadUserConfig(true);
				fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
			}
		} else {
			packagelist = config.packageList;
			console.info("[inf] Using cached list, use duckpm update to update.")
		}
		for (let pkg in packagelist) {
			for (let ver of packagelist[pkg]) {
				if (config.installed) {
					if (config.installed.hasOwnProperty(pkg + "@" + ver)) {
						console.info("[inf] " + pkg + "@" + ver + " - installed");
					} else {
						console.info("[inf] " + pkg + "@" + ver + " - not installed");
					}
				} else {
					console.info("[inf] " + pkg + "@" + ver + " - undefined");
				}
			}
		}
	} else if (params.positionals[0] == "listdwnpkg") {
		console.info("[inf] Downloaded package list (with versions):");
		for (let pkg in config.cachedpackages) {
			if (config.installed.hasOwnProperty(pkg)) {
				console.info("[inf] " + pkg + " - installed");
			} else {
				console.info("[inf] " + pkg + " - not installed");
			}
		}
	} else if (params.positionals[0] == "noop") {} else {
		console.info("[inf] Command line for duckpm:");
		console.info("[inf] duckpm install [package] ............. - installs or updates a package");
		console.info("[inf]        i                                 (alias)");
		console.info("[inf]                          --itself      - Makes duckpm \"install\" itself");
		console.info("[inf]                                          (init the configs)");
		console.info("[inf]                                          You can specify duckpm as a");
		console.info("[inf]                                          package instead.");
		console.info("[inf]                          --server      - Forces duckpm to get \"duckpm\"");
		console.info("[inf]                                          package from a server.");
		console.info("[inf]                          --path=[path] - As using system32 as a PATH");
		console.info("[inf]                                          folder for programs might be")
		console.info("[inf]                                          dangerous, you need to");
		console.info("[inf]                                          specify a PATH under Windows.");
		console.info("[inf]                                          This option will do that.");
		console.info("[inf]                          --noinstall   - Do not install packages on FS");
		console.info("[inf]                                          instead try out what changes");
		console.info("[inf]                                          will be made.");
		console.info("[inf]        remove [package] .............. - removes a package");
		console.info("[inf]        delete                            (alias)");
		console.info("[inf]        del                               (alias)");
		console.info("[inf]        rm                                (alias)");
		console.info("[inf]        uninstall                         (alias)");
		console.info("[inf]                          --itself      - Makes duckpm \"remove\" itself");
		console.info("[inf]                                          (remove the configs)");
		console.info("[inf]                          --nofile      - Do not remove files.");
		console.info("[inf]        update                          - updates the package index in the");
		console.info("[inf]                                          local config.");
		console.info("[inf]        clean                           - removes package index from the");
		console.info("[inf]                                          local config.");
		console.info("[inf]        cachesize                       - calculates the size of cache.");
		console.info("[inf]        listpkg                         - shows the packages that you");
		console.info("[inf]                                          installed.");
		console.info("[inf]        listonlpkg                      - shows the packages that are");
		console.info("[inf]                                          online (may take a while if");
		console.info("[inf]                                          there's no package list cache).");
		console.info("[inf]        listdwnpkg                      - shows the packages that you");
		console.info("[inf]                                          downloaded (may be not installed)");
		console.info("[inf]        cachepkg [package]              - caches the specified package");
		console.info("[inf]        noop                            - don't do anything");
		console.info("[inf]                          --quiet       - Program-wide setting to remove");
		console.info("[inf]                                          all console interaction");
		console.info("[inf]                          --hideoem     - Program-wide setting to remove");
		console.info("[inf]                                          \"Made by PCsoft\" prompt");
		console.info("[inf] More stuff coming soon.");
		process.exit(1);
	}
})();

async function installpkg(pkg, quiet = false) {
	if (!quiet) console.info("[inf] Getting server package list...");
	let parsed = {
		package: pkg.split("@")[0],
		version: pkg.split("@")[1]
	};
	let packagelist;
	if (!config.packageList || config.failedToLoad) {
		packagelist = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "list");
		packagelist = await packagelist.json();
		if (!config.failedToLoad) {
			userconfig.packageList = packagelist;
			reloadUserConfig(true);
			fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
		}
	} else {
		packagelist = config.packageList;
		if (!quiet) console.info("[inf] Using cached list, use duckpm update to update.")
	}
	if (!packagelist.hasOwnProperty(parsed.package)) {
		console.error("[err] Couldn't find \"" + (parsed.package || "") + "\" on the server.");
		return process.exit(1);
	}
	if (!packagelist[parsed.package].includes(parsed.version) && parsed.version) {
		console.error("[err] Couldn't find version \"" + parsed.version + "\" of package \"" + (parsed.package || "") + "\" on the server, however there are other versions available.");
		if (!quiet) console.info("[inf] The available versions are: " + packagelist[parsed.package].join(", "));
		return process.exit(1);
	}
	if (!parsed.version) {
		parsed.version = packagelist[parsed.package][packagelist[parsed.package].length - 1];
	}
	let package;
	let iscache = false;
	if (!config.cachedpackages || config.failedToLoad) {
		package = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "get?package=" + encodeURIComponent(parsed.package) + "&version=" + encodeURIComponent(parsed.version));
		package = await package.arrayBuffer();
		package = Buffer.from(new Uint8Array(package));
		if (!config.failedToLoad) {
			userconfig.cachedpackages = {};
			userconfig.cachedpackages[parsed.package + "@" + parsed.version] = package.toString("base64");
			reloadUserConfig(true);
			if (!params.values.noinstall) fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
		}
	} else if (!config.cachedpackages.hasOwnProperty(parsed.package + "@" + parsed.version)) {
		package = await fetch(config.serverLocation + (config.serverLocation.endsWith("/") ? "" : "/") + "get?package=" + encodeURIComponent(parsed.package) + "&version=" + encodeURIComponent(parsed.version));
		package = await package.arrayBuffer();
		package = Buffer.from(new Uint8Array(package));
		userconfig.cachedpackages[parsed.package + "@" + parsed.version] = package.toString("base64");
		reloadUserConfig(true);
		if (!params.values.noinstall) fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
	} else {
		iscache = true;
		package = Buffer.from(config.cachedpackages[parsed.package + "@" + parsed.version], "base64");
	}
	package = zlib.inflateSync(package).toString();
	package = JSON.parse(package);
	if (!quiet) console.info("[inf] Installing \"" + parsed.package + "@" + parsed.version + "\" from " + (iscache ? "local cache" : "remote") + "...");
	eval(package.preinstall);
	if (!params.values.noinstall) await handleFolders(params.values.path || ".", package.files);
	let symlinks = [];
	if (!params.values.path && (process.platform == "linux" || process.platform == "android")) {
		if (!quiet) console.info("[inf] Creating symlinks...");
		if (!params.values.noinstall) symlinks = await handleSymlinks(process.cwd(), package.programMaps || []);
	}
	if (!quiet) console.info("[inf] Writing uninstallation information...")
	if (!userconfig.installed) {
		userconfig.installed = {};
	} else {}
	if (!config.failedToLoad) {
		userconfig.installed[parsed.package + "@" + parsed.version] = {
			symlinks: symlinks,
			fs: Object.keys(package.files),
			path: (params.values.path || process.cwd()),
			removescripts: {
				preremove: package.preremove,
				postremove: package.postremove
			}
		};
		reloadUserConfig(true);
	} else {
		if (!quiet) console.warn("[wrn] You probably should install duckpm. Config not loaded, won't write uninstallation info.");
	}
	if (!params.values.noinstall) fs.writeFileSync(os.homedir() + "/.duckpm-local-config.json", JSON.stringify(userconfig, null, "\t"));
	reloadUserConfig(true);
	if (package.dependencies) {
		for (let dep of package.dependencies) {
			if (isInstalled(dep, config.installed)) continue;
			console.info("[inf] Installing missing dependency \"" + dep + "\"...");
			await installpkg(dep, true);
		}
	}
	eval(package.postinstall);
	if (!quiet) console.info("[inf] \"" + parsed.package + "\" installed successfully!");
}

function isInstalled(p, c) {
	for (let k in c) {
		if (k.startsWith(p + "@")) {
			return true;
		}
	}
	return false;
}