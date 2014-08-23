/**
 * Node.js WebSocket Chat System
 * By @pinodex.
 */

var Util = require("util");
var URL = require('url');
var Crypto = require('crypto');

var WebSocketServer = require('ws').Server;
var WebSocket = new WebSocketServer({
    port: 8000
});

var configuration = require('./configuration.js');
var commands = require('./commands.js');

var users = {};

WebSocket.broadcast = function(data, client) {
    if (typeof client == 'undefined'){
        var client = null;
    }

    for (var i in this.clients) {
        if (this.clients[i] != client) {
            this.clients[i].send(data);
        }
    };
};

objectSearch = function(object, value) {
    for (var prop in object) {
        if (object.hasOwnProperty(prop)) {
             if (object[prop] === value) {
                 return prop;
             }
        }
    }
};

WebSocket.on('connection', function(ws) {

    var originDomain = URL.parse(ws.upgradeReq.headers.origin).hostname;

    if (configuration.origins.indexOf(originDomain) < 0) {
        ws.send(JSON.stringify({
            type: 'system',
            message: 'Connection from unknown source refused.'
        }));

        ws.close();
        return;
    }

    ws.on('message', function(message) {
        var msg = JSON.parse(message);

        if (!('action' in msg)) {
            ws.close();
            return;
        }

        if (msg.action == 'login') {
            if (typeof objectSearch(users, ws) != 'undefined') {
                ws.close();
                return;
            }

            var name = msg.name;

            if (name.replace(/\s+/, '').length == 0 || /^\w+$/.test(name) === false) {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: 'Only alphanumeric characters and underscores are allowed for names.'
                }));

                ws.close();
                return;
            }

            if(name.toLowerCase() == 'server') {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: name . ' is not allowed.'
                }));

                ws.close();
                return;
            }

            if (configuration.bans.indexOf(name) > -1) {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: 'Your username <strong>' + name + '</strong> is banned.'
                }));

                ws.close();
                return;
            }

            if (name in users) {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: 'The username <strong>' + name + '</strong> already logged in.'
                }));

                ws.close();
                return;
            }

            if (name in configuration.sudoers && (typeof msg.pass == 'undefined' || msg.pass === null)) {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: 'This username is restricted. Please login with <strong>username:password</strong>'
                }));

                ws.close();
                return;
            }

            users[name] = ws;
            users[name]['sudo'] = false;
            ws['sudo'] = false;

            if ((typeof msg.pass != 'undefined' || msg.pass !== null) && name in configuration.sudoers) {
                if (configuration.sudoers[name] != Crypto.createHash('sha1').update(msg.pass).digest('hex')) {
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: 'Invalid password for <strong>' + name + '</strong>.'
                    }));

                    ws.close();
                    return;
                }

                users[name]['sudo'] = true;
                ws['sudo'] = true;
            }

            ws['name'] = msg.name;

            ws.send(JSON.stringify({
                type: 'auth',
                name: msg.name
            }));

            ws.send(JSON.stringify({
                type: 'system',
                message: 'Connection established.'
            }));

            ws.send(JSON.stringify({
                type: 'system',
                message: configuration.motd || 'Default MOTD.'
            }));

            ws.send(JSON.stringify({
                type: 'system',
                message: 'Hello there <strong>' + name + '</strong>!'
            }));

            WebSocket.broadcast(JSON.stringify({
                type: 'system',
                message: '<strong>' + name + '</strong> joined the chat.'
            }), ws);

            return;
        }

        if (typeof objectSearch(users, ws) === 'undefined') {
            return;
        }

        if (!('message' in msg)) {
            ws.close();
            return;
        }

        if (msg.message.charAt(0) === '/') {
            var command = msg.message.split(' ');
            var commandString = command[0].slice(1);

            ws.send(JSON.stringify({
                sudoer: ws.sudo,
                type: 'message',
                name: ws.name,
                message: msg.message
            }));

            if (!commands.hasOwnProperty(commandString)) {
                ws.send(JSON.stringify({
                    type: 'system',
                    message: 'Command not found. Type <strong>/help</strong> for the list of commands.'
                }));

                return;
            }

            var arguments = command.splice(0, 1);
            var output = commands[commandString](JSON.stringify(command), ws);

            if (typeof output == 'undefined') {
                return;
            }

            ws.send(JSON.stringify({
                type: 'system',
                message: output
            }));

            return;
        }

        WebSocket.broadcast(JSON.stringify({
            sudoer: ws.sudo,
            type: 'message',
            name: ws.name,
            message: msg.message
        }));
    });

    ws.on('error', function(error) {
        console.log('[ERROR] %s', error);
        ws.close();
    });

    ws.on('close', function() {
        var user = objectSearch(users, ws);

        if (typeof objectSearch(users, ws) === 'undefined') {
            return;
        }

        if (typeof users[user].kicked == 'undefined') {
            WebSocket.broadcast(JSON.stringify({
                type: 'system',
                message: '<strong>' + user + '</strong> has been disconnected.'
            }), ws);
        }

        delete users[user];
    });

});

exports.users = users;
exports.Crypto = Crypto;
exports.broadcast = function(data, ws) {
    WebSocket.broadcast(JSON.stringify(data), ws);
}
