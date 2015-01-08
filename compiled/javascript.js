function tarai(x,y,z){
  return tarai_prime(x,y,z);
}

function tarai_prime(x,y,z){
  if(x <= y) {
    return y;
  } else {
    return tarai(tarai(x-1, y,z), tarai(y-1,z,x), tarai(z-1, x, y));
  }
}

var st = process['hrtime']();
console.log(tarai(11,5,0));
var diff = process['hrtime'](st);
console['warn'](diff[0] * 1e9 + diff[1]);
