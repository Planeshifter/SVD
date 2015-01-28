#include <emscripten/bind.h>
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

typedef struct {
  int length;
  float *data;
} Vector;

val Vector_get(Vector& arr, int index) {
  if (index < arr.length) {
    return val(arr.data[index]);
  } else {
    return val::undefined();
  }
}

void Vector_set(Vector& arr, int index, float val){
  if (index < arr.length) {
    arr.data[index] = val;
  }
}

Vector makeFloatVector(int length){
  Vector ret;
  ret.length = length;
  return ret;
};

typedef struct {
  int nrows;
  int ncols;
  float **data;
} Matrix;

val Matrix_get(Matrix& arr, int i, int j) {
  if (i < arr.nrows && j < arr.ncols) {
    return val(arr.data[i][j]);
  } else {
    return val::undefined();
  }
}

void Matrix_set(Matrix& arr, int i, int j, float val){
  if (i < arr.nrows && j < arr.ncols) {
    arr.data[i][j] = val;
  }
}

Matrix makeMatrix(int nrows, int ncols){
  Matrix ret;
  ret.nrows = nrows;
  ret.ncols = ncols;
  ret.data = matrix_create(nrows, ncols);
  return ret;
}
