// Copyright 2019 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

var SyscallsAsyncLibrary = {
  $AsyncFSImpl: {},

  $AsyncFS__deps: ['$SYSCALLS', '$Asyncify', '$AsyncFSImpl'],
  $AsyncFS: {

    debug: function(...args) {
#if SYSCALL_DEBUG
      console.log('AsyncFS Syscall', arguments);
#endif
    },
  },


  __sys_exit: function(status) {
    exit(status);
    // no return
  },

  __sys_read: function(fd, buf, count) {
    AsyncFS.debug('sys_read', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.read(fd, {{{ heapAndOffset('HEAP8', 'buf') }}}, count);
    });
  },

  __sys_write: function(fd, buf, count) {
    AsyncFS.debug('sys_write', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.write(fd, {{{ heapAndOffset('HEAP8', 'buf') }}}, count);
    });
  },


  __sys_open: function(path, flags, varargs) {
    AsyncFS.debug('sys_open', arguments);
    return Asyncify.handleAsync(async () => {
      SYSCALLS.varargs = varargs;
      var pathname = SYSCALLS.getStr(path);
      var mode = SYSCALLS.get();
      return await AsyncFSImpl.open(pathname, flags, mode);
    });
  },

  __sys_unlink: function(path) {
    AsyncFS.debug('sys_unlink', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.unlink(path);
    });
  },

  __sys_chmod: function(path, mode) {
    AsyncFS.debug('sys_chmod', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path), mode = SYSCALLS.get();
      return await AsyncFSImpl.chmod(path, mode);
    });
  },

  __sys_getpid__nothrow: true,
  __sys_getpid__proxy: false,
  __sys_getpid: function() {
    return {{{ PROCINFO.pid }}};
  },

  __sys_access: function(path, amode) {
    AsyncFS.debug('sys_access', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.access(path, amode);
    });
  },

  __sys_mkdir: function(path, mode) {
    AsyncFS.debug('sys_mkdir', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.mkdir(path, mode);
    });
  },

  __sys_rmdir: function(path, mode) {
    AsyncFS.debug('sys_rmdir', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.rmdir(path);
    });
  },

  __sys_ioctl: function(fd, op, varargs) {
    AsyncFS.debug('sys_ioctl', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.ioctl(fd, op);
    });
  },

  __sys_readlink: function(path, buf, bufsize) {
    AsyncFS.debug('sys_readlink', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.readlink(path, buf, bufsize);
    });
  },

  __sys_munmap: function(addr, len) {
    AsyncFS.debug('sys_munmap', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.munmap(addr, len);
    });
  },

  __sys_fchmod: function(fd, mode) {
    AsyncFS.debug('sys_fchmod', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.fchmod(fd, mode);
    });
  },

  __sys_getcwd: function(buf, size) {
    AsyncFS.debug('sys_getcwd', arguments);
    return Asyncify.handleAsync(async () => {
      if (size === 0) {
        return -{{{ cDefine('EINVAL') }}};
      }
      //TODO consider removing fake result here
      var cwd = AsyncFSImpl.fakeCWD;
      var cwdLengthInBytes = lengthBytesUTF8(cwd);
      if (size < cwdLengthInBytes + 1) {
        return -{{{ cDefine('ERANGE') }}};
      }
      stringToUTF8(cwd, buf, size);
      return 0;
    });
  },

  __sys_ugetrlimit: function(resource, rlim) {
    AsyncFS.debug('sys_ugetrlimit', arguments);
    return Asyncify.handleAsync(async () => {
#if SYSCALL_DEBUG
      console.log('warning: untested call');
#endif
      var resource = SYSCALLS.get(), rlim = SYSCALLS.get();
      {{{ makeSetValue('rlim', C_STRUCTS.rlimit.rlim_cur, '-1', 'i32') }}};  // RLIM_INFINITY
      {{{ makeSetValue('rlim', C_STRUCTS.rlimit.rlim_cur + 4, '-1', 'i32') }}};  // RLIM_INFINITY
      {{{ makeSetValue('rlim', C_STRUCTS.rlimit.rlim_max, '-1', 'i32') }}};  // RLIM_INFINITY
      {{{ makeSetValue('rlim', C_STRUCTS.rlimit.rlim_max + 4, '-1', 'i32') }}};  // RLIM_INFINITY
      return 0; // just report no limits
    });
  },

  __sys_mmap2: function(addr, len, prot, flags, fd, off) {
    AsyncFS.debug('sys_mmap2', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.mmap2(addr, len, prot, flags, fd, off);
    });
  },

  __sys_ftruncate64: function(fd, zero, low, high) {
    AsyncFS.debug('sys_ftruncate64', arguments);
    return Asyncify.handleAsync(async () => {
      var length = SYSCALLS.get64(low, high);
      return await AsyncFSImpl.truncate(fd, length);
    });
  },

  __sys_stat64: function(path, buf) {
    AsyncFS.debug('sys_stat64', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.stat64(path, buf);
    });
  },

  // Since NativeIO doesn't have links, lstat behaves the same as stat
  __sys_lstat64: function(path, buf) {
    AsyncFS.debug('sys_lstat64', arguments);
    return Asyncify.handleAsync(async () => {
      path = SYSCALLS.getStr(path);
      return await AsyncFSImpl.stat64(path, buf);
    });
  },

  __sys_fstat64: function(fd, buf) {
    AsyncFS.debug('sys_fstat64', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.fstat64(fd, buf);
    });
  },

  __sys_fcntl64: function(fd, cmd, varargs) {
    AsyncFS.debug('sys_fcntl64', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.fcntl(fd, cmd);
    });
  },

  __sys_getuid32__sig: 'i',
  __sys_getuid32__nothrow: true,
  __sys_getuid32__proxy: false,
  __sys_getuid32: '__sys_getegid32',
  __sys_getgid32__sig: 'i',
  __sys_getgid32__nothrow: true,
  __sys_getgid32__proxy: false,
  __sys_getgid32: '__sys_getegid32',
  __sys_geteuid32__sig: 'i',
  __sys_geteuid32__nothrow: true,
  __sys_geteuid32__proxy: false,
  __sys_geteuid32: '__sys_getegid32',
  __sys_getegid32__nothrow: true,
  __sys_getegid32__proxy: false,
  __sys_getegid32: function() {
    return 0;
  },

  __sys_fchown32: function(fd, owner, group) {
    AsyncFS.debug('sys_fchown32', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.fchown32(fd, owner, group);
    });
  },

  __sys_chown32: function(path, owner, group) {
    AsyncFS.debug('sys_chown32', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.chown32(fd, owner, group);
    });
  },
  // WASI

  fd_write__sig: 'iiiii',
  fd_write: function(fd, iov, iovcnt, pnum) {
    AsyncFS.debug('fd_write', arguments);
    return Asyncify.handleAsync(async () => {
      if(fd == 1 || fd==2) {
        // TODO: remove once AsyncFSImpl supports stdio
        // Hack to support printf when AsyncFSImpl does not support stdio
        var num = 0;
        var str = '';
        for (var i = 0; i < iovcnt; i++) {
          var ptr = {{{ makeGetValue('iov', 'i*8', 'i32') }}};
          var len = {{{ makeGetValue('iov', 'i*8 + 4', 'i32') }}};
          for (var j = 0; j < len; j++) {
              str += String.fromCharCode(HEAPU8[ptr+j]);
          }
          num += len;
        }
        console.log(str);
        {{{ makeSetValue('pnum', 0, 'num', 'i32') }}}
        return 0;
      }

      let result = await AsyncFSImpl.writev(fd, iov, iovcnt);
      {{{ makeSetValue('pnum', 0, 'result', 'i32') }}};
      return 0;
    });
  },

  fd_read__sig: 'iiiii',
  fd_read: function(fd, iov, iovcnt, pnum) {
    AsyncFS.debug('fd_read', arguments);
    return Asyncify.handleAsync(async () => {
      let result =  await AsyncFSImpl.readv(fd, iov, iovcnt);
      {{{ makeSetValue('pnum', 0, 'result', 'i32') }}}
      return 0;
    });
  },

  fd_seek__sig: 'iiiiii',
  fd_seek: function(fd, {{{ defineI64Param('offset') }}}, whence, newOffset) {
    AsyncFS.debug('fd_seek', arguments);
    return Asyncify.handleAsync(async () => {
      {{{ receiveI64ParamAsI32s('offset') }}}
      let result = await AsyncFSImpl.llseek(fd, offset_high, offset_low, whence);
      {{{ makeSetValue('newOffset', 0, 'result', 'i64') }}}
      return 0;
    });
  },

  fd_close__sig: 'ii',
  fd_close: function(fd) {
    AsyncFS.debug('fd_close', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.close(fd);
    });
  },

  fd_fdstat_get__sig: 'iii',
  fd_fdstat_get: function(fd, pbuf) {
    AsyncFS.debug('fd_fdstat_get', arguments);
    return Asyncify.handleAsync(async () => {
      console.log('WARNING called unimplemented fd_fdstat_get syscalls.');
      return {{{ -cDefine('ENOSYS') }}};
    });
  },

  fd_sync: function(fd) {
    AsyncFS.debug('fd_sync', arguments);
    return Asyncify.handleAsync(async () => {
      return await AsyncFSImpl.fsync(fd);
    });
  },

  // TODO: Add more syscalls.
};

autoAddDeps(SyscallsAsyncLibrary, '$AsyncFS');

mergeInto(LibraryManager.library, SyscallsAsyncLibrary);

assert(ASYNCIFY && WASM_BACKEND, "ASYNCFS requires ASYNCIFY with the wasm backend");
