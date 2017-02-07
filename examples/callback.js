const events = require('events');
const phantom = require('phantom');
const http = require('http');
const fs = require('fs');
const index = fs.readFileSync(__dirname + '/callback.html');

const SERVER_PORT = process.env.SERVER_PORT || 8080;

const eventEmitter = new events.EventEmitter();

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
}).listen(SERVER_PORT);

phantom.create(['--debug=true'],{ logLevel: 'debug' }) //--remote-debugger-port=9001',
    .then(instance => {
    phInstance = instance;
    return instance.createPage();
})
.then(page => {
    page.property('onResourceRequested', function (requestData, networkRequest) {
        console.log('ResourceRequested (#' + requestData.id + '): ' + JSON.stringify(requestData));
    });

    var files = [];

    page.on("takeShot", function(parameters) {
        console.log("TakeShot Event: %s ", parameters);
        if(files.length >= parameters.count){
            //all shots done
            page.close();
            return phInstance.exit(0);
        }

        var file = __dirname + '/slide-'+ parameters.index + '.png';
        console.log("Rendering Slide: " + file);
        page.render(file);
        files.push(file);
    });

    page.property('onCallback', function (command, parameters, target) {
        console.log('Website Callback received. Command: ' + command + ' Prameters: ' + JSON.stringify(parameters));

        //ugly hack to trigger _takeShot_ event in node process, which then is passed back to create a page render
        //see: lib/phantom.js:148
        console.log('<event>'+ JSON.stringify({
                target: target,
                type: command,
                args: parameters
        }));
    }, page.target);

    var url = 'http://localhost:' + SERVER_PORT + '/';
    page.open(url).then(status => {
        if (status === 'fail') {
            console.log("PageOpen failed!" + url);
            clearTimeout(renderTimeout);
            page.close();
            phInstance.exit();
        }
    });
})
.catch(error => {
    console.log('Error: ' + error);
    phInstance.exit();
});

