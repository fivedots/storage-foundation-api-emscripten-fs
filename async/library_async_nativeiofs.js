// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

mergeInto(LibraryManager.library, {
  $AsyncFSImpl: {

    /* Debugging */

    debug: function(...args) {
      //entries = nativeIO.listByPrefix('');
      //decodedEntries = [];
      //for (e of entries) { decodedEntries.push(AsyncFSImpl.decodePath(e)) }
      // console.log('nativeIOfs', arguments);
    },

    /* Syscalls */

    lastFileDescriptor: 100,
    // Associates a fileDescriptor (a number) with a FileHandle. This file handle
    // is the object obtained from calling nativeIO.open and may be expanded with new
    // fields (e.g. seek_position).
    fileDescriptorToFileHandle: {},
    pathToFileDescriptor: {},

    pathExists: async function(path) {
      let encodedPath = AsyncFSImpl.encodePath(path);
      let entries = await nativeIO.getAll();
      return entries.includes(encodedPath);
    },

    encodePath: function(path) {
      //TODO: this is a aandom hex encoding decide and document on reasonable
      //scheme
      var s = unescape(encodeURIComponent(path))
      var h = ''
      for (var i = 0; i < s.length; i++) {
          h += s.charCodeAt(i).toString(16)
      }
      return h
    },

    decodePath: function(hex) {
      var s = ''
      for (var i = 0; i < hex.length; i+=2) {
          s += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
      }
      return decodeURIComponent(escape(s))
    },

    randomFH: {
      read: async function(buffer, offset) {
        // TODO: Simplify this!
        let length = buffer.bytesLength;
        let bytesRead = 0;
        for (let i = 0; i < length; i++) {
          try {
            let randomBuffer = new Uint8Array(1);
            crypto.getRandomValues(randomBuffer);
            let result =  randomBuffer[0];
          } catch (e) {
            throw new FS.ErrnoError({{{ cDefine('EIO') }}});
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError({{{ cDefine('EAGAIN') }}});
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[i] = result;
        }
        return bytesRead;
      },
      close: async function() {
        return 0;
      },
      seek_position: 0
    },

    fakeCWD: '/fake_async_nativeIO_dir',

    getAbsolutePath: function(pathname) {
      if(!pathname.startsWith('/')) {
        return AsyncFSImpl.fakeCWD + '/' + pathname;
      }
      return pathname;
    },

    printOpenFlag: function(flags) {
      var knownFlags = {
        'O_CREAT':{{{ cDefine('O_CREAT') }}},
        'O_EXCL':{{{ cDefine('O_EXCL') }}},
        'O_DIRECTORY':{{{ cDefine('O_DIRECTORY') }}},
        'O_TRUNC':{{{ cDefine('O_TRUNC') }}},
        'O_RDONLY':{{{ cDefine('O_RDONLY') }}},
        'O_SYNC':{{{ cDefine('O_SYNC') }}},
        'O_RDWR':{{{ cDefine('O_RDWR') }}},
        'O_WRONLY':{{{ cDefine('O_WRONLY') }}},
        'O_APPEND':{{{ cDefine('O_APPEND') }}},
        'O_NOFOLLOW':{{{ cDefine('O_NOFOLLOW') }}},
        'O_ACCMODE':{{{ cDefine('O_ACCMODE') }}}
      }
      for (kf in knownFlags) {
        if(flags & knownFlags[kf]){
          console.log('open received flag', kf)
        }
      }
    },

    open: async function(pathname, flags, mode) {
      //TODO: consider handling opens for directories
      //TODO: consifer handling flags
      if(flags & {{{ cDefine('O_APPEND') }}}) {
        console.log('WARNING open called with unsupported append flag');
      }
      if(flags & {{{ cDefine('O_TRUNC') }}}) {
        console.log('WARNING open called with unsupported O_TRUNC flag');
      }
      let absolutePath = AsyncFSImpl.getAbsolutePath(pathname);
      var fh;
      if (absolutePath == '/dev/urandom') {
        console.log("Warning: Accessing random!");
        fh = AsyncFSImpl.randomFH;
      }
      else {
        let encodedPath = AsyncFSImpl.encodePath(absolutePath);
        fh = await nativeIO.open(encodedPath)
      }
      fh.seek_position = 0;
      fh.timestamp = Date.now();
      fh.path = absolutePath;
      let fd = AsyncFSImpl.lastFileDescriptor++;
      AsyncFSImpl.fileDescriptorToFileHandle[fd] = fh;
      AsyncFSImpl.pathToFileDescriptor[absolutePath] = fd;
      return fd;
    },

    ioctl: async function(fd, op) {
      return -{{{cDefine('ENOSYS')}}};
    },

    populateStatBuffer: function(stat, buf) {
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_dev, 'stat.dev', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.__st_dev_padding, '0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.__st_ino_truncated, 'stat.ino', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_mode, 'stat.mode', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_nlink, 'stat.nlink', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_uid, 'stat.uid', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_gid, 'stat.gid', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_rdev, 'stat.rdev', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.__st_rdev_padding, '0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_size, 'stat.size', 'i64') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_blksize, '4096', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_blocks, 'stat.blocks', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_atim.tv_sec, '(stat.atime.getTime() / 1000)|0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_atim.tv_nsec, '0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_mtim.tv_sec, '(stat.mtime.getTime() / 1000)|0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_mtim.tv_nsec, '0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_ctim.tv_sec, '(stat.ctime.getTime() / 1000)|0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_ctim.tv_nsec, '0', 'i32') }}};
      {{{ makeSetValue('buf', C_STRUCTS.stat.st_ino, 'stat.ino', 'i64') }}};
    },

    doStat: async function(fh, buf) {
      let length = await fh.getLength();
      let modificationTime = new Date(fh.timestamp);
      let stat = {
          dev: null,
          ino: null,
          mode: 33188,
          nlink: 1,
          uid: 0,
          gid: 0,
          rdev: null,
          size: length,
          atime: modificationTime,
          mtime: modificationTime,
          ctime: modificationTime,
          blksize: 4096,
          blocks: Math.ceil(length / 4096),
      };
      AsyncFSImpl.populateStatBuffer(stat, buf);
    },

    stat64: async function(pathname, buf) {
      let absolutePath = AsyncFSImpl.getAbsolutePath(pathname);
      let exists = await AsyncFSImpl.pathExists(absolutePath);
      if (!exists) return -{{{ cDefine('ENOENT') }}};
      if (absolutePath in AsyncFSImpl.pathToFileDescriptor) {
        let fd = AsyncFSImpl.pathToFileDescriptor[absolutePath];
        let fh = AsyncFSImpl.fileDescriptorToFileHandle[fd];
        await AsyncFSImpl.doStat(fh, buf);
        return 0;
      }
      else {
        encodedPath = AsyncFSImpl.encodePath(absolutePath);
        let fh = await nativeIO.open(encodedPath);
        await AsyncFSImpl.doStat(fh, buf);
        await fh.close();
        return 0;
      }
    },

    fstat64: async function(fd, buf) {
      let fh = AsyncFSImpl.fileDescriptorToFileHandle[fd];
      await AsyncFSImpl.doStat(fh, buf);
      return 0;
    },

    chmod: async function(path, mode) {
      return -{{{cDefine('ENOSYS')}}};
    },

    access: async function(path, amode) {
      return -{{{cDefine('ENOSYS')}}};
    },

    mkdir: async function(path, mode) {
      return -{{{cDefine('ENOSYS')}}};
    },

    rmdir: async function(path) {
      return -{{{cDefine('ENOSYS')}}};
    },

    fchown32: async function(fd, owner, group) {
      // We ignore permisions for now. If we started supporting an mtime, it
      // would have to be updated
      return 0;
    },

    chown32: async function(path, owner, group) {
      return -{{{cDefine('ENOSYS')}}};
    },

    fcntl: async function(fd, cmd) {
      if( cmd != {{{ cDefine('F_SETLK') }}} ) {
        return -{{{cDefine('ENOSYS')}}};
      }
      return 0;// Pretend that the locking was successful.
    },

    read: async function(fd, buffer, offset, length) {
      var fh = AsyncFSImpl.fileDescriptorToFileHandle[fd];
      var data = buffer.subarray(offset, offset + length);
      let bytes_read = await fh.read(data, fh.seek_position);
      fh.seek_position += bytes_read;
      buffer.set(data, offset);
      return bytes_read;
    },

    write: async function(fd, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError({{{ cDefine('EINVAL') }}});
      }
      var fh = AsyncFSImpl.fileDescriptorToFileHandle[fd];
      var seeking = typeof position !== 'undefined';
      if (!seeking) {
        position = fh.seek_position;
      }
      var data = buffer.subarray(offset, offset + length);
      let bytes_written = await fh.write(data, position);
      fh.timestamp = Date.now();
      if (!seeking) fh.seek_position += bytes_written;
      return bytes_written;
    },

    readlink: async function(path, buf, bufsize) {
      return -{{{cDefine('ENOSYS')}}};
    },

    munmap: async function(addr, len) {
      return -{{{cDefine('ENOSYS')}}};
    },

    fchmod: async function(fd, mode) {
      return -{{{cDefine('ENOSYS')}}};
    },

    fsync: async function(fd) {
      await AsyncFSImpl.fileDescriptorToFileHandle[fd].flush();
      return 0;
    },

    mmap2: async function(addr, len, prot, flags, fd, off) {
      return -{{{cDefine('ENOSYS')}}};
    },

    readv: async function(fd, iovs) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = {{{ makeGetValue('iov', 'i*8', 'i32') }}};
        var len = {{{ makeGetValue('iov', 'i*8 + 4', 'i32') }}};
        var curr = await AsyncFSImpl.read(fd, {{{ heapAndOffset('HEAP8', 'ptr') }}}, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
      }
      return ret;
    },

    writev: async function(fd, iov, iovcnt, offset) {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = {{{ makeGetValue('iov', 'i*8', 'i32') }}};
        var len = {{{ makeGetValue('iov', 'i*8 + 4', 'i32') }}};
        var curr = await AsyncFSImpl.write(fd, {{{ heapAndOffset('HEAP8', 'ptr') }}}, len, offset);
        if (curr < 0) return -1;
        ret += curr;
      }
      return ret;
    },

    unlink: async function(pathname) {
      var absolutePath = AsyncFSImpl.getAbsolutePath(pathname);

      encodedPath = AsyncFSImpl.encodePath(absolutePath);
      try {
        await nativeIO.delete(encodedPath);
        return 0;
      } catch(e) {
        console.log("Unlink faild with error", e);
        return e;
      }
    },

    truncate: async function(fd, length) {
      var fh = AsyncFSImpl.fileDescriptorToFileHandle[fd];
      fh.timestamp = Date.now();
      await fh.setLength(length);
      return 0;
    },

    // This function does not conform to the common linux llseek, rather it is
    // used for wasi so it's expected to return the new offset relative to the
    // start of a file.
    llseek: async function(fd, offset_high, offset_low, whence) {
      var HIGH_OFFSET = 0x100000000; // 2^32
      // use an unsigned operator on low and shift high by 32-bits
      var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
      var position = offset;
      if (whence === {{{ cDefine('SEEK_CUR') }}}) {
        position += AsyncFSImpl.fileDescriptorToFileHandle[fd].seek_position
      } else if (whence === {{{ cDefine('SEEK_END') }}}) {
        return -{{{cDefine('ENOSYS')}}};
      }
      AsyncFSImpl.fileDescriptorToFileHandle[fd].seek_position = position;
      return position;
    },

    close: async function(fd, ) {
      // TODO generally add handling of std streams
      if(fd < 2) {
        return 0;
      }
      await AsyncFSImpl.fileDescriptorToFileHandle[fd].close();
      let path_to_delete = AsyncFSImpl.fileDescriptorToFileHandle[fd].path;
      delete AsyncFSImpl.fileDescriptorToFileHandle[fd];
      delete AsyncFSImpl.pathToFileDescriptor[path_to_delete];
      return 0;
    },
  }
});
