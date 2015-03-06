var timely = require("timely");
var numericSVD = timely( require("numeric").svd );
var emscriptenSVD = timely( require("../svd.js").svd );

var mat = [
  [ 1, 2, 3, 5, 5, 8, 7 ],
  [ 3, 4, 2, 5, 7, 6, 4 ],
  [ 8, 4, 3, 9, 2, 4, 3 ],
  [ 5, 4, 2, 7, 5, 8, 0 ],
  [ 2, 5, 1, 1, 0, 3, 4 ],
  [ 7, 8, 9, 1, 2, 4, 3 ],
  [ 5, 2, 1, 0, 3, 5, 3 ]
];

console.time("NumericJS");
resNumeric = numericSVD(mat);
console.timeEnd("NumericJS");

console.time("Emscripten");
resNumeric = emscriptenSVD(mat);
console.timeEnd("Emscripten");
