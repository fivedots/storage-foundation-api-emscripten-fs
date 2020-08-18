// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
  EM_ASM(FS.truncate("/nativeio/nativeio_test", 5));

  ofstream mem_file;
  mem_file.open ("/memfs/memfs_test");
  mem_file << "MemFS!\n";
  mem_file.close();
  EM_ASM(FS.truncate("/memfs/memfs_test",4));

  EM_ASM({console.log("NATIVEIOFS file content:", arrayToString(readEmscriptenFile("/nativeio/nativeio_test", 0, 10)))});
  EM_ASM({console.log("MEMFS file content:", arrayToString(readEmscriptenFile("/memfs/memfs_test", 0, 7)))});
  return 0;
}
