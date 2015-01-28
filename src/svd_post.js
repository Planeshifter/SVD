function fromMatrix(mat){
	var a = [];
	  for(var i = 0; i < mat.nrows; i++){
		  a.push([]);
		  for(var j = 0; j < mat.ncols; j++){
			  a[i][j] = mat.get(i,j);
		  }
	  }
	return a;
}

function fromVector(vec){
	var v = [];
	for(var i = 0; i < vec.length; i++){
		v.push( vec.get(i) );
	}
	return v;
}

Module["svd"] = function(arr){
	var m = arr.length;
	var n = arr[0].length;
  var mat = new Module["Matrix"](m, n);
  for (var i = 0; i < m; i++){
    for (var j = 0; j < n; j++){
      mat.set(i, j, arr[i][j]);
	}
  }
  var ret = Module["_svd"](mat, m, n)

  var o = {};
	o.u = fromMatrix(ret.u);
  o.v = fromMatrix(ret.v);
  o.w = fromVector(ret.w);
  o.r = ret.r;
  return o;
};
