/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Returns a buffer with the contents of the file at 'path' from offset to
// offset + length
function readEmscriptenFile(path, offset, length) {
  var stream = FS.open(path);
  var buf = new Uint8Array(length);
  FS.read(stream, buf, offset, length);
  FS.close(stream);
  return buf;
}

function arrayToString(arr) {
  return String.fromCharCode.apply(null, arr);
}
