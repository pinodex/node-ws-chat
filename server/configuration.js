/**
 * Node.js WebSocket Chat System
 * https://github.com/pinodex/node-ws-chat
 */

var FileSystem = require('fs');

var configuration = {

    configFile: 'config.json',
    motdFile: 'motd.txt',

    motd: null,

    load: function(file) {
        file = file || this.configFile;

        FileSystem.readFile(file, 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading configuration file: ' + err);

                process.exit(1);
                return;
            }

            var data = JSON.parse(data);

            for (var i in data) {
                configuration[i] = data[i];
            }
        });
    },

    loadMotd: function(file) {
        file = file || this.motdFile;

        FileSystem.readFile(file, 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading MOTD file: ' + err.code + ' ' + err.errno);
                return;
            }

            configuration.motd = data;
        });
    },

    addSudoer: function(username, password) {

    },

    writeToConfig: function(key, value, file) {
        file = file || this.configFile;

        var config;

        FileSystem.readFile(file, 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading config file: ' + err.code + ' ' + err.errno);
                return;
            }

            config = JSON.parse(data);

            if (!(key in config)) {
                console.log('Configuration key: "' + key + '"" not found.');
                return;
            }

            if (config[key] instanceof Array) {
                for (var i in value) {
                    config[key].push(value[i]);
                }
            } else if (config[key] instanceof Object) {
                for (var i in value) {
                    config[key][i] = value[i];
                }
            }

            var jsonOutput = JSON.stringify(config, undefined, 2);

            FileSystem.writeFile(file, jsonOutput, function(err) {
                if (err) {
                    console.log(err);
                    return;
                }

                configuration.load();
            });

        });
    },

    removeConfigEntry: function(key, entry, file) {
        file = file || this.configFile;

        var config;

        FileSystem.readFile(file, 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading config file: ' + err.code + ' ' + err.errno);
                return;
            }

            config = JSON.parse(data);

            if (!(key in config)) {
                console.log('Configuration key: "' + key + '"" not found.');
                return;
            }

            if (!entry in config[key]) {
                console.log('Configuration entry: "' + entry + '" not found.');
                return;
            }

            if (config[key] instanceof Array) {
                var index = config[key].indexOf(entry);
                config[key].splice(index, 1);
            } else {
                config[key][entry] = undefined;
            }

            var jsonOutput = JSON.stringify(config, undefined, 2);

            FileSystem.writeFile(file, jsonOutput, function(err) {
                if (err) {
                    console.log(err);
                    return;
                }
                
                configuration.load();
            });

        });
    }

};

module.exports = configuration;
configuration.load();
configuration.loadMotd();
