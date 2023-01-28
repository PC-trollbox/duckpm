# duckpm
A kinda ducky way of doing package managing.


## Contribution
PRs are welcome.


## Server
Server is specified in `duckpm-global-config.json` file. If you don't have it, run `node main install --itself` or `duckpm install --itself`.

Then change `serverLocation` value, to a server, for example http://localhost:3000/quack/.

The server and its index are located in the folder "server-packages".

You'll need Express for the server to run. Do `npm install express` to install the required tool.

You can also concat servers now. If you think one repository is cool, another one is cool and your one is cool, you can now set those three to be accessible at the same time.

In `server.js`, `concatservers` array can be set so you can enjoy any number of repositories at the same time:

For example, `let concatservers = [];` means local only.

`let concatservers = [ "https://ducksserver.com/quack" ];` means local packages and also packages from `https://ducksserver.com/quack`.

Or `let concatservers = [ "https://ducksserver.com/quack", "http://192.168.0.1:3000/duck/" ];` means local packages, packages from `https://ducksserver.com/quack`, and packages from `http://192.168.0.1:3000/duck/`.

For four repositories (including local), you can do this array: `let concatservers = [ "https://ducksserver.com/quack", "http://192.168.0.1:3000/duck/", "https://verylargecollectionof.unexistentpackages.com/quack/" ];` which means means local packages, packages from `https://ducksserver.com/quack`, packages from `http://192.168.0.1:3000/duck/`, and packages from `https://verylargecollectionof.unexistentpackages.com/quack/` are available.