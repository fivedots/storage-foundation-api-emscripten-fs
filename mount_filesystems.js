Module.onRuntimeInitialized = function() {
  FS.mkdir('/nativeio');
  FS.mount(NATIVEIOFS, { root: '.' }, '/nativeio');

  FS.mkdir('/memfs');
  FS.mount(MEMFS, { root: '.' }, '/memfs');
}
