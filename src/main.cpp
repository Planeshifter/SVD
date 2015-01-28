#include <emscripten/bind.h>
#include "svd.h"
#include "Arrays.h"
using namespace emscripten;

float *vector_create(int len){
  float *arr=NULL;
  arr = (float *) malloc((len*sizeof(float)));
  return(arr);
}

float **matrix_create(int row, int col){
  int i;
  float **arr=NULL;
  arr = (float **) malloc((row*sizeof(float*)));
  arr[0]=(float*) malloc((row*col)*sizeof(float));

  for(i=1; i<row; i++)
    arr[i]=arr[i-1] + col;

  return arr;
}


typedef struct{
  Matrix u;
	Matrix v;
	Vector w;
	int r;
} ReturnObj;

ReturnObj dsvdInterface(Matrix A, int m, int n){
	float** a = A.data;
	float** v = matrix_create(m, n);
	float* w = vector_create(m);
	int ret = dsvd(a, m, n, w, v);

	Matrix v_ret;
	v_ret.data = v;
	v_ret.nrows = m;
	v_ret.ncols = n;

	Vector w_ret;
	w_ret.data = w;
	w_ret.length = m;

	ReturnObj o;
  o.u = A;
	o.v = v_ret;
	o.w = w_ret;
	o.r = ret;
	return o;
}


EMSCRIPTEN_BINDINGS(my_module) {
	function("_svd", &dsvdInterface, allow_raw_pointers());

  value_object<ReturnObj>("ReturnObj")
  	.field("w", &ReturnObj::w)
    .field("u", &ReturnObj::u)
  	.field("v", &ReturnObj::v)
  	.field("r", &ReturnObj::r);
}

EMSCRIPTEN_BINDINGS(non_member_functions) {
  class_<Vector>("Vector")
    .function("get", &Vector_get)
  	.function("set", &Vector_set)
  	.property("length",&Vector::length)
  	.constructor(&makeFloatVector, allow_raw_pointers());

	class_<Matrix>("Matrix")
		.function("get", &Matrix_get)
		.function("set", &Matrix_set)
		.property("nrows", &Matrix::nrows)
		.property("ncols", &Matrix::nrows)
		.constructor(&makeMatrix, allow_raw_pointers());
}
