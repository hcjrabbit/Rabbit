/**
 * Auhor: chengjun.hecj
 * Descript:
 */

var http = require('http'),
    fs = require('fs');


var Req = {
    init: function (options) {
        if(global.isRequest)
            return;

        global.isRequest = true;
        var requestOptions = {
            hostname: options.hostname,
            path: options.path,
            method: 'POST',
            headers: {
                Connection: 'keep-alive',
                Accept: 'text/html, application/xhtml+xml, */*',
                'Accept-Language': 'zh-CN',
                'Content-Type': 'application/json',
                'Content-Length': options.data.length
            }
        };
        var req = http.request(requestOptions, function (res) {
            if (res.statusCode !== 200) {
                callback('服务器异常，请稍后重试。。。。!');
                return;
            }
            res.setEncoding('utf8');
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end',function(){
                if(global.isFirstGetCompents){
                    global.$('#onlineStatus').addClass('online');
                    global.isFirstGetCompents = true;
                }
                data = JSON.parse(data);
                if (data.success && data.data) {
                    options.callback && options.callback(data.data);
                }else{
                    callback('服务器异常，请稍后重试。。。。!');
                }
                global.isRequest = false;
            });
        });

        req.on('error', function (e) {
            global.$('#onlineStatus').removeClass('online');
            global.isRequest = false;
            callback('problem with request: ' + e.message);
        });

        req.write(data + '\n');
        req.end();
    }
};

module.exports = Req;