# duckpm
A kinda ducky way of doing package managing.


## Contribution
PRs are welcome.


## Server
Server is specified in `duckpm-global-config.json` file. If you don't have it, run `node main install --itself` or `duckpm install --itself`.

Then change `serverLocation` value, to a server, for example http://localhost:3000/quack/.

The server and its index are located in the folder "server-packages".

You'll need Express and Body-Parser for the server to run. Do `npm install express body-parser` to install the required tools.

### Server concatenation

You can concat servers. If you think one repository is cool, another one is cool and your one is cool, you can now set those three to be accessible at the same time.

In `server.js`, `concatservers` array can be set so you can enjoy any number of repositories at the same time:

For example, `let concatservers = [];` means local only.

`let concatservers = [ "https://ducksserver.com/quack" ];` means local packages and also packages from `https://ducksserver.com/quack`.

Or `let concatservers = [ "https://ducksserver.com/quack", "http://192.168.0.1:3000/duck/" ];` means local packages, packages from `https://ducksserver.com/quack`, and packages from `http://192.168.0.1:3000/duck/`.

For four repositories (including local), you can do this array: `let concatservers = [ "https://ducksserver.com/quack", "http://192.168.0.1:3000/duck/", "https://verylargecollectionof.unexistentpackages.com/quack/" ];` which means means local packages, packages from `https://ducksserver.com/quack`, packages from `http://192.168.0.1:3000/duck/`, and packages from `https://verylargecollectionof.unexistentpackages.com/quack/` are available.

### Server credentials

Users can publish packages now. The server now gives an administration token and an user token. You should store your administration token securely. The tokens are re-regenerated every time. If you want, you can choose a fixed token to use.

### manifest.json

You can specify a few things in the manifest. `preinstall` and `preremove` are running before installing or removing your package. These are JS scripts, which are run with an `eval`. `postinstall` and `postremove` are running after installing or removing your package. `programMaps` is what will be symlinked to the user's directory. `dependencies` is some package you require to be installed with your package. There's also an internal property `files` - you shouldn't really use it. The original server and client will do the `files` work automatically.