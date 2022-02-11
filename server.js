//TCP
const net = require('net');
const db = require('./db')();
const connection = db.init();
db.db_open(connection);

let apple = {
    posX : 0,
    posY : 0
};

let clients = [];
let gameActive = false;
let readyPlayer = 0;
let readyPlayerId = {};

let sendStartMessage = (client, clientId, canStart) => {
    var res = {
        message: {
            type: 0,
            clientId: clientId,
            start: canStart,
            apple: apple
        }
    };

    sendTo(clientId, res);
}

let sendTo = (clientId, res) => {
    console.log();
    console.log("Send to client" + clientId);
    console.log(res);

    clients[clientId].client.write(JSON.stringify(res));
}

let sendToBoth = (clientId, res, resOther) => {
    console.log();
    console.log("Send to client" + clientId);
    console.log(res);

    clients[clientId].client.write(JSON.stringify(res));

    console.log();
    console.log("Send to client" + (1 - clientId));
    console.log(resOther);

    clients[1 - clientId].client.write(JSON.stringify(resOther));
}

let generateRandom = (bound) => {
    return Math.floor(Math.random() * bound * 2.0 + 1.0) - bound;
}

let tServer = net.createServer(function(client) {
    console.log("connection : "+client.remotePort);

    if (clients.length >= 2) {
        console.log('connection is full(max : 2)');
        return;
    }

    if (gameActive) {
        console.log('game is active');
        return;
    }

    console.log('Client connection');
    console.log('   local = '+ client.localAddress +':'+ client.localPort);
    console.log('   remote ='+ client.remoteAddress+':'+ client.remotePort);
    console.log('   client ='+ JSON.stringify(client));
    
    let clientId = clients.length;

    clients.push(
        {
            name : client.remotePort,
            client : client
        }
    );
    
    console.log("connection clients list : "+ clients);

    client.setEncoding('utf8');
    
    client.on('data', function(data) {
        console.log();
        console.log("Receive from client" + clientId);
        console.log(data);

        let message = JSON.parse(data);

        switch (message.type) {
            case 0:
                //start
                console.log("type 0 (start)");
                readyPlayer++;
                var canStart = readyPlayer == 2;

                sendStartMessage(clients[clientId].client, clientId, canStart);

                if (canStart) {
                    apple = {
                        posX : 0,
                        posY : 0
                    };

                    gameActive = true;

                    if (clients.length == 2){
                        sendStartMessage(clients[1 - clientId].client, 1 - clientId, canStart);
                    }
                }
                break;
            case 1:
                //snake position, direction
                console.log("type 1 (snake position, direction)");

                var res = {
                    message: {
                        type: 1,
                        snake: message.snake
                    }
                };
            
                console.log();
                console.log("Send to client" + (1 - clientId));
                console.log(res);
            
                clients[1 - clientId].client.write(JSON.stringify(res));

                break;
            case 2:
                //apple collision 
                console.log("type 2 (apple collision)");

                if (apple.posX == message.apple.posX 
                    && apple.posY == message.apple.posY) {
                    apple.posX = generateRandom(16);
                    apple.posY = generateRandom(7);

                    var res  = (isMine) => { 
                        return {
                            message: {
                                type: 2,
                                apple: {
                                    posX : apple.posX,
                                    posY : apple.posY
                                },
                                isMine : isMine
                            }
                        }
                    };
    
                    sendToBoth(clientId, res(true), res(false));
                }
                break;
            case 3:
                //game end
                console.log("type 3 (game end)");

                if (!gameActive) {
                    return;
                }

                var res  = (win) => { 
                    return {
                        message: {
                            type: 3,
                            win : win
                        }
                    }
                };

                sendToBoth(clientId, res(message.win), res(!message.win));

                db.insert_record(connection, readyPlayerId[clientId], message.win);
                db.insert_record(connection, readyPlayerId[1 - clientId], !message.win);
                
                break;
            case 4:
                //find user
                console.log("type 4 (find user)");

                var res  = (isExist, userId) => { 
                    return {
                        message: {
                            type: 4,
                            isExist : isExist
                        }
                    }
                };

                var error  = (err) => { 
                    return {
                        message: {
                            type: 6,
                            error : err
                        }
                    }
                };

                db.select_user(connection, message.username, 
                    (err, data) => {
                        if (err != null) {
                            sendTo(clientId, error(err));
                            return;
                        }

                        if (data.length == 0){
                            sendTo(clientId, res(false, null));
                        } else {
                            sendTo(clientId, res(true));
                            readyPlayerId[clientId] = data[0].id;
                        }
                    });
                break;
            case 5:
                //create user
                console.log("type 5 (create user)");

                db.insert_user(connection, message.username, (err, data) => {
                    if (err != null) {
                        sendTo(clientId, err(err));
                        return;
                    }

                    var res  = (isSuccess) => { 
                        return {
                            message: {
                                type: 5,
                                isSuccess : isSuccess
                            }
                        }
                    };
    
                    sendTo(clientId, res(true));
                    readyPlayerId[clientId] = data[0].id;
                });
                
                break;
            case 6:
                //find records
                console.log("type 6 (find records)");

                db.select_record(connection, readyPlayerId[clientId], (err, data) => {
                    if (err != null) {
                        sendTo(clientId, err(err));
                        return;
                    }

                    var res  = (records) => { 
                        return {
                            message: {
                                type: 6,
                                records : records
                            }
                        }
                    };
    
                    sendTo(clientId, res(data));
                });
                
                break;
            default:
                console.log("invalid message type");
        }
    });

    
    client.on('end', function() {

        console.log("end connection : "+client.remotePort);
        console.log(client.remoteAddress + ' Client disconnected');
        let idx = clients.indexOf(clients.name);
        clients.splice(idx,1);
        console.log(clients);

        if(clients.length == 0) {
            readyPlayer = 0;
            gameActive = false;
        }
    });
    
    client.on('error', function(err) {
        console.log('Socket Error: ', JSON.stringify(err));
    });
    
    client.on('timeout', function() {
        console.log('Socket Timed out');
    });

});
 
tServer.listen(3000, function() {
    console.log('TCP Server listening on : ' + JSON.stringify(tServer.address()));
    tServer.on('close', function(){
        console.log('Server Terminated');
    });
    tServer.on('error', function(err){
        console.log('Server Error: ', JSON.stringify(err));
    });
});