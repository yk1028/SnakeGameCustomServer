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
let readyPlayerCount = 0;
let readyPlayers = [];
let readyPlayerIds = {};
let readyUserIds = {};

let sendStartMessage = (clientId, canStart) => {
    var res = {
        message: {
            type: 0,
            clientId: clientId,
            start: canStart,
            apple: apple
        }
    };

    console.log();
    console.log("Send to client" + clientId);
    console.log(res);

    readyPlayers[clientId].client.write(JSON.stringify(res));
}

let sendToBoth = (clientId, res, resOther) => {
    console.log();
    console.log("Send to client" + clientId);
    console.log(res);

    readyPlayers[clientId].client.write(JSON.stringify(res));

    console.log();
    console.log("Send to client" + (1 - clientId));
    console.log(resOther);

    readyPlayers[1 - clientId].client.write(JSON.stringify(resOther));
}

let generateRandom = (bound) => {
    return Math.floor(Math.random() * bound * 2.0 + 1.0) - bound;
}

let tServer = net.createServer(function(client) {
    console.log("connection : "+client.remotePort);

    if (readyPlayerCount == 2) {
        console.log('player is full(max : 2)');
        client.end();
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
    let readyPlayerId = 0;

    clients.push(
        {
            name : client.remotePort,
            client : client
        }
    );
    
    console.log("connection clients list : "+ clients);

    client.setEncoding('utf8');
    
    client.on('data', function(data) {
        if(clients.length == 1) {
            clientId = 0;
        }

        console.log();
        console.log("Receive from client" + clientId);
        console.log(data);
        
        try {
            let message = JSON.parse(data);
         
            switch (message.type) {
                case 0:
                    //start
                    console.log("type 0 (start)");

                    readyPlayers.push(
                        {
                            client : client
                        }
                    );

                    readyPlayerId = readyPlayerCount;
                    readyPlayerIds[readyPlayerId] = readyUserIds[client.remotePort];
                    readyPlayerCount++;

                    let canStart = readyPlayerCount == 2

                    if (canStart) {
                        apple = {
                            posX : 0,
                            posY : 0
                        };

                        gameActive = true;
                        sendStartMessage(1 - readyPlayerId, canStart);
                    }

                    sendStartMessage(readyPlayerId, canStart);

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
                    console.log("Send to client" + (1 - readyPlayerId));
                    console.log(res);
                
                    if (readyPlayers[1 - readyPlayerId].client !== undefined) {
                        readyPlayers[1 - readyPlayerId].client.write(JSON.stringify(res));
                    }

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
        
                        sendToBoth(readyPlayerId, res(true), res(false));
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

                    sendToBoth(readyPlayerId, res(message.win), res(!message.win));

                    db.insert_record(connection, readyPlayerIds[readyPlayerId], message.win);
                    db.insert_record(connection, readyPlayerIds[1 - readyPlayerId], !message.win);
                    
                    readyPlayerCount = 0;
                    readyPlayers = [];

                    gameActive = false;

                    break;
                case 4:
                    //find user
                    console.log("type 4 (find user)");

                    var res  = (isExist) => { 
                        return {
                            message: {
                                type: 4,
                                isExist : isExist
                            }
                        }
                    };

                    db.select_user(connection, message.username, 
                        (err, data) => {
                            if (err != null) {
                                throw err;
                            }

                            if (data.length == 0){
                                console.log();
                                console.log("Send to client" + clientId);
                                console.log(res(false));
                                client.write(JSON.stringify(res(false)));
                            } else {
                                console.log();
                                console.log("Send to client" + clientId);
                                console.log(res(true));
                                client.write(JSON.stringify(res(true)));
                                readyUserIds[client.remotePort] = data[0].id;
                            }
                        });
                    break;
                case 5:
                    //create user
                    console.log("type 5 (create user)");

                    db.insert_user(connection, message.username, (err, data) => {
                        if (err != null) {
                            throw err;
                        }

                        var res  = (isSuccess) => { 
                            return {
                                message: {
                                    type: 5,
                                    isSuccess : isSuccess
                                }
                            }
                        };
        
                        console.log();
                        console.log("Send to client" + clientId);
                        console.log(res(true));
                        client.write(JSON.stringify(res(true)));
                        readyUserIds[client.remotePort] = data[0].id;
                    });
                    
                    break;
                case 6:
                    //find records
                    console.log("type 6 (find records)");

                    db.select_record(connection, readyUserIds[client.remotePort], (err, data) => {
                        if (err != null) {
                            throw err;
                        }

                        var res  = (records) => { 
                            return {
                                message: {
                                    type: 6,
                                    records : records
                                }
                            }
                        };
        
                        console.log();
                        console.log("Send to client" + clientId);
                        console.log(res(data));
                        client.write(JSON.stringify(res(data)));
                    });
                    
                    break;
                default:
                    console.log("invalid message type");
            }
        } catch (e) {
            console.log(`error : ${e.name}: ${e.message}`);
        }
    });

    
    client.on('end', function() {

        console.log("end connection : "+client.remotePort);
        console.log(client.remoteAddress + ' Client disconnected, client Id : ' + clientId);
        clients.splice(clientId,1);
        console.log(clients);
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