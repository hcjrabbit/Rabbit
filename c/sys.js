/**
 * Auhor: chengjun.hecj
 * Descript:
 */
var sys = '',
    navigator = global.navigator;
if(navigator.userAgent.indexOf("Window")>0){
    sys = "Windows";
}else if(navigator.userAgent.indexOf("Mac OS X")>0) {
    sys = "Mac";
}else if(navigator.userAgent.indexOf("Linux")>0) {
    sys = "Linux";
}
module.exports = sys;

