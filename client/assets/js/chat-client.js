$(function(){

    $('.login-form').submit(function(e){
        e.preventDefault();

        var name = $('.login-form input').val();

        if (name.replace(/\s+/, '').length == 0) {
            $('.login-form input').val('').focus();
            $('.login-window-container .error').html('Name cannot be empty.').show();

            return;
        }

        if (/^(\w+)(:?)(\w+)$/.test(name) === false) {
            $('.login-window-container .error').html('Only alphanumeric characters and underscores are allowed for names.').show();

            return;
        }

        if (name == 'SERVER' || name == 'server') {
            $('.login-window-container .error').html(name + ' is a reserved username.').show();
            return
        }

        document.user = {
            'name' : name
        };

        if (name.indexOf(':') != -1) {
            var userData = name.split(':');

            document.user.name = userData[0];
            document.user.pass = userData[1];
        }

        $('.login-window-container').fadeOut(function(){
            websocket.connect();

            $('.chat-window-container').fadeIn();
        });
    });

    $('.composer').submit(function(e){
        e.preventDefault();

        if (typeof document.user == 'undefined') {
            return;
        }

        var message = $('.composer').find('input').val();

        if (message.indexOf('/clear') != -1) {
            chat.clear();
            return;
        }

        chat.send(message);
    });

    $('.logout').click(function(){
        if (typeof document.user == 'undefined') {
            return;
        }

        chat.composer.val('/quit').submit().val('');
        chat.sendBtn.text('Send').attr('disabled', 'disabled');
    });
});

var chat = {
    name: null,

    me: 'me',
    system: 'system',
    mate: 'mate',

    chats: $('.chats'),
    composer: $('.composer input'),
    sendBtn: $('.composer button[type="submit"]'),

    established: false,

    send: function(message){
        if (message.replace(/\s+/, '').length == 0) {
            return;
        }

        if (typeof document.user == 'undefined') {
            return;
        }

        if (!this.established) {
            return;
        }

        chat.close();
        websocket.send(message);
    },

    add: function(who, message, type) {
        if (message instanceof Array) {
            message = message.join('<br />');
        }

        var date = new Date();
        message = (type == 'system' ? message : chat.escape(message));
        who = (type == 'system' ? 'SERVER' : chat.escape(who));

        $('<div class="msg ' + type + '" title="Sent: ' + date + '" />')
            .append('<span class="nick">' + who + ': </span>')
            .append('<span class="message">' + message + '</span>')
            .appendTo(this.chats);

        this.chats.scrollTop(this.chats[0].scrollHeight);
    },

    clear: function() {
        this.chats.empty();
        this.composer.val('').focus();
    },

    close: function() {
        this.composer.attr('disabled', 'disabled');
        this.sendBtn.text('Sending...').attr('disabled', 'disabled');
    },

    open: function() {
        this.composer.removeAttr('disabled').val('').focus();
        this.sendBtn.removeAttr('disabled').text('Send');
    },

    escape: function(s) {
        if (typeof s == 'undefined') {
            return s;
        }

        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

var websocket = {
    conn: null,

    connect: function() {
        if (this.conn == null) {
            chat.add(chat.system, 'Connecting to server...', chat.system);
            this.conn = new WebSocket('ws://localhost:8080');
        }

        this.conn.onopen = function() {
            websocket.conn.send(
                JSON.stringify({
                    action: 'login',
                    name: document.user.name,
                    pass: document.user.pass || null,
                    message: null
                })
            );

            $('.disconnect button').removeAttr('disabled');
            chat.established = true;
        };

        this.conn.onerror = function() {
            chat.add('SERVER', 'An error occurred.', chat.system);
        };

        this.conn.onmessage = function(e){
            var data = $.parseJSON(e.data);

            if (data.type == 'auth') {
                chat.name = data.name;
                return;
            }

            if (data.type == 'system') {
                chat.add(chat.system, data.message, chat.system);
                chat.open();
                return;
            }

            var who = data.name == chat.name ? chat.me : chat.mate;

            if (data.sudoer) {
                data.name = '[OP] ' + data.name;
            }

            chat.add(data.name, data.message, who);
            chat.open();
        };

        this.conn.onclose = function() {
            chat.add(chat.system, 'Connection closed by remote server.', chat.system);
            this.conn = null;

            $('.logout').attr('disabled', 'disabled');

            delete document.user;
            chat.established = false;
        };
    },

    send: function(message) {
        if (typeof document.user == 'undefined') {
            return;
        }

        if (this.conn == null) {
            chat.add('ERROR', 'Error connecting to server.', chat.system);
            return;
        }

        this.conn.send(
            JSON.stringify({
                action: 'chat',
                name: document.user.name,
                message: message
            })
        );
    }
}
