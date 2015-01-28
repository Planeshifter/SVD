emcc  -c  "src/svd.cpp" -g -O3 -Wall  -o ./svd.o -I. -I. -c

emcc -O3 svd.o --bind src/main.cpp -I./ --post-js src/svd_post.js -o svd.js 
