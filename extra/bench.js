var st = process.hrtime();

// put main process here

var diff = process.hrtime(st);

process.stderr.write("" + (diff[0] * 1e9 + diff[1]) + "\n");
