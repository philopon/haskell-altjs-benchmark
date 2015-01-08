
var st = process['hrtime']();
window.onload();
var diff = process['hrtime'](st);

console['warn'](diff[0] * 1e9 + diff[1]);
