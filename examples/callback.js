const events = require('events');
const phantom = require('phantom');
const http = require('http');
const fs = require('fs');
const index = fs.readFileSync('callback.html');

const SERVER_PORT = process.env.SERVER_PORT || 8080;

const eventEmitter = new events.EventEmitter();

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
}).listen(SERVER_PORT);

phantom.create(['--debug=true'],{ logLevel: 'debug',eventEmitter: eventEmitter }) //--remote-debugger-port=9001',
    .then(instance => {
    phInstance = instance;
    return instance.createPage();
})
.then(page => {
    page.property('onResourceRequested', function (requestData, networkRequest) {
        console.log('ResourceRequested (#' + requestData.id + '): ' + JSON.stringify(requestData));
    });

    eventEmitter.on(page.target,function(event,parameters){
        console.log("Event: %s ", event, parameters);
        var file = parameters.index + '.png';
        console.log("File: " + file);
        page.render(file);
    });

    page.property('onCallback', function (command, parameters, target) {
        console.log('Website Callback received. Command: ' + command + ' Prameters: ' + JSON.stringify(parameters));//<- code never reached
        console.log('<event>'+ JSON.stringify({
                target: target,
                type: command,
                args: parameters
        }));
    }, page.target);

    var url = 'http://localhost:'+SERVER_PORT+'/';
    page.open(url).then(status => {
        if (status === 'fail') {
            console.log("PageOpen failed!" + url);
            clearTimeout(renderTimeout);
            page.close();
            ph.exit(1);
        }
    });
})
.catch(error => {
    console.log('Error: ' + error);
    phInstance.exit();
});

