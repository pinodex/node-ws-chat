node-ws-chat
============

Simple chat system with Node.js and WebSockets

### Dependancy:
- [einaros/ws](https://github.com/einaros/ws)

### Installation:
    $ npm install ws
    $ node server.js

### Features
- Origin access control
- Chat operators (the sudoers)
- Kick a user
- Ban a user

### Changing server listening IP/Port.
Check the `server.js` file. It is self-explanatory, as well as the client.

### config.json
All configurations are saved in `config.json` file. The `origins` control what domain the server will allow to originate the requests. The `sudoers` are the chat OPs, passwords are in SHA-1. The `bans` are the banned usernames.

### Message-of-the-Day
This will be shown to the user once they logged in, to change it, edit `motd.txt`.

### Editing configuration files
If you edited the configuration files (`config.json, motd.txt`), changes does not automatically effect, you should reload the configs for the changes take effect.
- /reloadconfig - applies changes from `config.json`.
- /reloadmotd - applies changes from `motd.txt`.

### Default OP login
- Username: admin
- Password: admin

### Commands
For the list of commands, type `/help` in the chatbox.

### Demo
[http://playground.pinodex.com/wschat/](http://playground.pinodex.com/wschat/)