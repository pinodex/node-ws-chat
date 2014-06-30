/**
 * Node.js WebSocket Chat System
 * https://github.com/pinodex/node-ws-chat
 */

var configuration = require('./configuration.js');
var server = require('./server.js');

var commands = {

    help: function(args, ws) {
        var commands = [
            'User commands:',
            '',
            '<strong>/whoami</strong> - returns your information on the chatbox.',
            '<strong>/users</strong> - lists logged in users',
            '<strong>/quit</strong> - disconnects the client.'
        ];

        if (ws.sudo) {
            commands.push(
                '',
                'SUDO commands:',
                '<strong>/kick &lt;username&gt;</strong> - kick the user out.',
                '<strong>/ban &lt;domain&gt;</strong> - ban username',
                '<strong>/unban &lt;domain&gt;</strong> - unban username',
                '<strong>/sudoer &lt;add|remove&gt; &lt;username&gt; &lt;password&gt;</strong> - add/remove sudoer',
                '<strong>/origin &lt;add|remove&gt; &lt;domain&gt;</strong> - add/remove origin domains',
                '<strong>/changepassword &lt;old password&gt; &lt;new password&gt; - change password.'
            );
        }

        return commands;
    },

    whoami: function(args, ws) {
        return ws.name;
    },

    kick: function(args, ws) {
        var args = JSON.parse(args);
        var user = args[0];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (!(user in server.users)) {
            return 'User ' + user + ' not found.'
        }

        if (user == ws.name) {
            return 'Kicking your own ass out? lol';
        }

        server.broadcast({
            type: 'system',
            message: '<strong>' + user + '</strong> has been kicked by <em>' + ws.name + '</em>'
        }, ws);

        server.users[user]['kicked'] = true;
        server.users[user].close();

        return 'You kicked <strong>' + user + '</strong>';
    },

    ban: function(args, ws) {
        var args = JSON.parse(args);
        var user = args[0];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (user == ws.name) {
            return 'You cannot ban yourself.';
        }

        if (user in configuration.sudoers) {
            return 'You cannot ban a sudoer. Remove the user from the sudoers before banning.'
        }

        if (configuration.bans.indexOf(user) > -1) {
            return 'The user <strong>' + user + '</strong> is already banned.';
        }

        configuration.writeToConfig('bans', [user]);

        if (user in server.users) {
                server.broadcast({
                    type: 'system',
                    message: '<strong>' + user + '</strong> has been banned by <em>' + ws.name + '</em>'
                }, ws);

                server.users[user]['kicked'] = true;
                server.users[user].close();
        }

        return 'You username <strong>' + user + '</strong> has been banned.';
    },

    unban: function(args, ws) {
        var args = JSON.parse(args);
        var user = args[0];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (configuration.bans.indexOf(user) < 0) {
            return 'Could not find user from the ban list.';
        }

        configuration.removeConfigEntry('bans', user);
        return user + ' has been removed from the ban list.';
    },

    sudoer: function(args, ws) {
        var args = JSON.parse(args);
        var action = args[0];
        var username = args[1];
        var password = args[2];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (typeof action == 'undefined') {
            return 'Invalid syntax.';
        }

        if (action != 'add' && action != 'remove') {
            return [
                'sudoer: Invalid argument: ' + action,
                'Usage: <strong>/sudoer &lt;add|remove&gt; &lt;username&gt; &lt;password&gt;</strong>'
            ];
        }

        if (typeof username == 'undefined') {
            return 'Missing argument: username.';
        }

        if (username.replace(/\s+/, '').length == 0 || /^\w+$/.test(username) === false) {
            return 'Username should only include alpha-numeric characters and underscores.';
        }

        if (username == ws.name) {
            return 'You cannot add/remove yourself from the sudoer.';
        }

        if (action == 'add') {
            if (typeof password == 'undefined') {
                return 'Missing argument: password.';
            }

            if (username in configuration.sudoers) {
                return username + ' already in the sudoers.';
            }

            if (/(?=.{8}).*/.test(password) === false) {
                return 'Password should be at least 8 characters long,';
            }

            var password = server.Crypto.createHash('sha1').update(password).digest('hex');
            var userData = {};

            userData[username] = password;
            configuration.writeToConfig('sudoers', userData);

            if (username in server.users) {
                server.broadcast({
                    type: 'system',
                    message: ws.name + ' made <strong>' + username + '</strong> an OP.'
                }, ws);

                server.users[username].send(JSON.stringify({
                    type: 'system',
                    message: [
                        'You are now an OP by ' + ws.name,
                        'You will be disconnected in 3 seconds, please login again with your password.'
                    ]
                }));

                setTimeout(function(){
                    server.users[username].close();
                }, 3000);
            }

            return username + ' added to sudoers.';
        }

        if (action == 'remove') {
            if (!(username in configuration.sudoers)) {
                return username + ' is not in the sudoers.';
            }

            configuration.removeConfigEntry('sudoers', username);

            if (username in server.users) {
                server.broadcast({
                    type: 'system',
                    message: '<strong>' + username + '</strong> is no longer an OP'
                }, ws);

                server.users[username].send(JSON.stringify({
                    type: 'system',
                    message: [
                        'You are no longer an OP by ' + ws.name,
                        'You will be disconnected in 3 seconds, please login again with your username.'
                    ]
                }));

                setTimeout(function(){
                    server.users[username].close();
                }, 3000);
            }

            return username + ' is no longer an OP.';
        }

        return 'Invalid syntax';
    },

    origin: function(args, ws) {
        var args = JSON.parse(args);
        var action = args[0];
        var domain = args[1];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (typeof action == 'undefined') {
            return 'Invalid syntax.'
        }

        if (typeof domain == 'undefined') {
            return 'Invalid syntax.'
        }

        if (action != 'add' && action != 'remove') {
            return 'Invalid syntax.';
        }

        if (!/^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/.test(domain)) {
            return 'Invalid domain.';
        }

        if (action == 'add') {
            configuration.writeToConfig('origins', [domain]);
            return domain + ' added to access control origin list.';
        }

        if (action == 'remove') {
            configuration.removeConfigEntry('origins', domain);
            return domain + ' has been removed from access control origin list.';
        }

        return 'Invalid syntax.';
    },

    changepassword: function(args, ws) {
        var args = JSON.parse(args);
        var oldPw = args[0];
        var newPw = args[1];

        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        if (typeof oldPw == 'undefined') {
            return 'Invalid syntax.';
        }

        if (typeof newPw == 'undefined') {
            return 'Invalid syntax.';
        }

        if (server.Crypto.createHash('sha1').update(oldPw).digest('hex') != configuration.sudoers[ws.name]) {
            return 'Old password does not match.';
        }

        if (/(?=.{8}).*/.test(newPw) === false) {
            return 'Password should be at least 8 characters long,';
        }

        var user = {};
        user[ws.name] = server.Crypto.createHash('sha1').update(newPw).digest('hex');

        configuration.writeToConfig('sudoers', user);
        return 'Password has been successfully changed!';
    },

    users: function(args, ws) {
        var output = [
            'Logged in users:'
        ];

        for (i in server.users) {
                if (i == ws.name) {
                        i = '<em>' + i + '</em>';
                }

                output.push(' &bullet; ' + i);
        }

        return output;
    },

    quit: function(args, ws) {
        ws.close();
    },

    reloadconfig: function(args, ws) {
        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        configuration.load();
        return 'Reloaded configuration file.';
    },

    reloadmotd: function(args, ws) {
        if (!ws.sudo) {
            return 'You are not in the sudoers.'
        }

        configuration.loadMotd();
        return 'Reloaded MOTD file. Please check logs for errors.'
    }

};

module.exports = commands;
