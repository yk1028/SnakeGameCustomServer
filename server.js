//TCP
const net = require('net');

//클라이언트 저장할 배열
let clients = [];
let tServer = net.createServer(function(client) {
    console.log("connection : "+client.remotePort);

    if (clients.length >= 2) {
        console.log('connection is full(max : 2)');
        return;
    }

    console.log('Client connection');
    console.log('   local = '+ client.localAddress +':'+ client.localPort);
    console.log('   remote ='+ client.remoteAddress+':'+ client.remotePort);
    console.log('   client ='+ JSON.stringify(client));
    
    let clientId = clients.length;

    //클라이언트 정보 저장
    clients.push(
        {
            name : client.remotePort,
            client : client
        }
    );
    
    console.log("connection clients list : "+ clients);
    
    client.on('data', function(data) {
		//데이터를 발신한 소켓 클라이언트에게 메시지 발신
        if (clients.length > 1) {
            let idx = 1- clientId;
            clients[idx].client.write(data);
        }
    });

    
    client.on('end', function() {
    	//클라이언트 소켓이 커넥션을 끊었을때 
        console.log("end connection : "+client.remotePort);
        console.log(client.remoteAddress + ' Client disconnected');
        let idx = clients.indexOf(clients.name);
        clients.splice(idx,1);
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