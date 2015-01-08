var diff = process['hrtime'](st);

console['warn'](diff[0] * 1e9 + diff[1]);
