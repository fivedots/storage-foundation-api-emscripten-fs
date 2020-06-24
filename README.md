# NativeIO Emscripten Filesytem

This repo contains an Emscripten filesystem implementation that uses NativeIO
as a backend. It must be run within a Web Worker, since it uses the synchronous
version of the API.

> NOTE: This filesystem is incomplete, it will be updated (and cleaned) as more
> parts of NativeIO become accessible. Missing pieces include rename, setting
> attributes, sub-directories, etc.

An example C++ program (example.cpp) is included. It show basic file operations
and how to read a file from JavaScript.

The mount_filesystems.js script shows how multiple filesystems can be made
accessible to one module.

## How-To

To compile the example run:

```shell
emcc --js-library ./library_nativeiofs.js \
  --post-js ./mount_filesystems.js --post-js ./read_file.js \
  -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE='["$NATIVEIOFS","$MEMFS"]' \
  -s USE_PTHREADS=1  \
  -o example.js example.cpp
```

> NOTE: USE_PTHREADS=1 is used to ensure that the Wasm module is instantiated
> with a SharedArrayMemory as the backing structure of the memory. This is
> required (for now) by the read/write calls.

To see the result run:

```shell
emrun --serve_after_exit --no_browser index.html
```

And then open the following link in a Chrome instance with the
"Experimental Web Platform features" flag enabled:
[localhost:6931](http://localhost:6931/).
