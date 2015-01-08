var st = process['hrtime']();
console.log(Elm.Main.make(Elm).test);
var diff = process['hrtime'](st);

console['warn'](diff[0] * 1e9 + diff[1]);
