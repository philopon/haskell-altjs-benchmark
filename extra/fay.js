
var st = process['hrtime']();
Fay$$_(Fay.main, true);
var diff = process['hrtime'](st);

console['warn'](diff[0] * 1e9 + diff[1]);
