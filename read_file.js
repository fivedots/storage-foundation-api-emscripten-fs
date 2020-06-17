// Returns a buffer with the contents of the file at 'path' from offset to
// offset + length
function readEmscriptenFile(path, offset, length) {
  var stream = FS.open(path);
  var buf = new Uint8Array(length);
  FS.read(stream, buf, offset, length, 0);
  return buf;
}

function arrayToString(arr) {
  return String.fromCharCode.apply(null, arr);
}
