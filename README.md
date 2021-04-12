# Storage Foundation API Emscripten Filesytem

This repo contains an Emscripten filesystem implementation that uses Storage
Foundation API as a backend. It must be run within a Web Worker, since it uses
the synchronous version of the API.

> NOTE: This filesystem is incomplete, it will be updated (and cleaned) as more
> parts of Storage Foundation API become accessible. Missing pieces include
> rename, setting attributes, sub-directories, etc.

An example C++ program (example.cpp) is included. It show basic file operations
and how to read a file from JavaScript.

The mount_filesystems.js script shows how multiple filesystems can be made
accessible to one module.

## How-To

To compile the example run:

```shell
emcc --js-library ./library_sfafs.js \
  --post-js ./mount_filesystems.js --post-js ./read_file.js \
  -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE='["$SFAFS","$MEMFS"]' \
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

## Experimental Asynchronous Filesystem

An experimental attempt at an asynchronous Emscripten file system is included in
folder `async/`. Unfortunately, it requires to modify the emscripten runtime by
exchanging the syscalls in `src/library_syscalls.js` and `src/library_wasi.js`
with their asynchronous counterparts of `async/library_syscall_async.js`. This
has to be done by manually replacing them in the files; we are working on a more
convenient method.
