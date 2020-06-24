#include <iostream>
#include <fstream>
#include <string>

#include <emscripten.h>

using namespace std;

int main () {
  ofstream nativeIO_file;
  //Used to test that concurrent opens are possible
  ofstream nativeIO_file2;
  nativeIO_file.open ("/nativeio/nativeio_test");
  nativeIO_file << "NativeIO!\n";
  nativeIO_file2.open ("/nativeio/nativeio_test");
  nativeIO_file.close();
  nativeIO_file2.close();

  ofstream mem_file;
  mem_file.open ("/memfs/memfs_test");
  mem_file << "MemFS!\n";
  mem_file.close();

  EM_ASM({console.log("NATIVEIOFS file content:", arrayToString(readEmscriptenFile("/nativeio/nativeio_test", 0, 10)))});
  EM_ASM({console.log("MEMFS file content:", arrayToString(readEmscriptenFile("/memfs/memfs_test", 0, 7)))});
  return 0;
}
