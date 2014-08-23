/*! by @pinodex */

var WebSocketServer = require('ws').Server;
var WebSocket = new WebSocketServer({
	port: 8000
});

var Commands = require('./commands.js').Commands;

var users = {};
var motd = [
	'll    ll  llllllll  ll        ll      llllll  ',
	'll    ll  ll        ll        ll     ll    ll ',
	'llllllll  lllll     ll        ll    ll      ll',
	'll    ll  ll        ll        ll     ll    ll ',
	'll    ll  llllllll  llllllll  llllll  llllll  ',
	'',
	'This is an example of WebSocket chat system.',
	'Server time: ' + new Date()
];

WebSocket.broadcast = function(data, client) {
	if(typeof client == 'undefined'){
		var client = null;
	}

	for(var i in this.clients) {
		if(this.clients[i] != client) {
			this.clients[i].send(data);
		}
	};
};

objectSearch = function(object, value) {
	for(var prop in object) {
		if(object.hasOwnProperty(prop)) {
			 if(object[prop] === value) {
				 return prop;
			 }
		}
	}
};

WebSocket.on('connection', function(ws) {

	console.log('[DEBUG] Client connected');

	ws.on('message', function(message) {
		console.log('[DEBUG] Message received: %s', message);

		var msg = JSON.parse(message);

		if(msg.action == 'login'){
			var name = msg.name;

			if(name.replace(/\s+/, '').length == 0 || /^\w+$/.test(name) === false){
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

			if(name in users){
				ws.send(JSON.stringify({
					type: 'system',
					message: 'The username <strong>' + name + '</strong> already logged in.'
				}));

				ws.close();
				return;
			}

			ws.send(JSON.stringify({
				type: 'system',
				message: 'Connection established.'
			}));

			ws.send(JSON.stringify({
				type: 'system',
				message: motd
			}));

			users[name] = ws;

			ws.send(JSON.stringify({
				type: 'system',
				message: 'Hello there <strong>' + name + '</strong>!'
			}));

			WebSocket.broadcast(JSON.stringify({
				type: 'system',
				message: '<strong>' + name + '</strong> joined the chat.'
			}), ws, true);

			return;
		}

		if (typeof objectSearch(users, ws) === 'undefined') {
			return;
		}
		
		if(msg.message.charAt(0) === '/'){
			console.log('COMMAND');

			var command = msg.message.split(' ');
			var commandString = command[0].slice(1);

			if(!Commands.hasOwnProperty(commandString)){
				ws.send(JSON.stringify({
					type: 'system',
					message: 'Command not found. Type <strong>/help</strong> for the list of commands.'
				}));

				return;
			}

			var arguments = command.splice(0, 1);
			var output = Commands[commandString](JSON.stringify(command), objectSearch(users, ws), ws);

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
			type: 'message',
			name: msg.name,
			message: msg.message
		}), ws);
	});

	ws.on('error', function(error) {
		console.log('[ERROR] %s', error);
		ws.close();
	});

	ws.on('close', function() {
		var user = objectSearch(users, ws);

		if(!user){
			return;
		}

		WebSocket.broadcast(JSON.stringify({
			type: 'system',
			message: '<strong>' + user + '</strong> has been disconnected.'
		}), ws);

		delete users[user];
	});

});