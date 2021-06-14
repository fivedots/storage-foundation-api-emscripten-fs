// Copyright 2020 Google LLC
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
  $SFAFS__deps: ['$FS'],
  $SFAFS: {

    benchmark: function(name, fct) {
      if('benchmark_results' in Module) {
        let time_pre = performance.now();
        let result = fct();
        let time_needed = performance.now() - time_pre;

        Module.benchmark_results[`${name}_time`] = (Module.benchmark_results[`${name}_time`] || 0) + time_needed;
        Module.benchmark_results[`${name}_num`] = (Module.benchmark_results[`${name}_num`] || 0) + 1;
        return result;
      }
      return fct();
    },

    /* Debugging */

    debug: function(...args) {
      // Uncomment to print debug information.
      //
      // console.log('SFAFS', arguments);
    },

    /* Helper functions */

    realPath: function(node) {
      var parts = [];
      while (node.parent !== node) {
        parts.push(node.name);
        node = node.parent;
      }
      if (!parts.length) {
        return '_';
      }
      parts.push('');
      parts.reverse();
      return parts.join('_');
    },

    encodedPath: function(node) {
      return SFAFS.encodePath(SFAFS.realPath(node));
    },

    joinPaths: function(path1, path2) {
      if (path1.endsWith('_')) {
        if (path2.startsWith('_')) {
          return path1.slice(0, -1) + path2;
        }
        return path1 + path2;
      } else {
        if (path2.startsWith('_')) {
          return path1 + path2;
        }
        return path1 + '_' + path2;
      }
    },

    // directoryPath ensures path ends with a path delimiter ('_').
    //
    // Example:
    // * directoryPath('_dir') = '_dir_'
    // * directoryPath('_dir_') = '_dir_'
    directoryPath: function(path) {
      if (path.length && path.slice(-1) == '_') {
        return path;
      }
      return path + '_';
    },

    // extractFilename strips the parent path and drops suffixes after '_'.
    //
    // Example:
    // * extractFilename('_dir', '_dir_myfile') = 'myfile'
    // * extractFilename('_dir', '_dir_mydir_myfile') = 'mydir'
    extractFilename: function(parent, path) {
      parent = SFAFS.directoryPath(parent);
      path = path.substr(parent.length);
      var index = path.indexOf('_');
      if (index == -1) {
        return path;
      }
      return path.substr(0, index);
    },

    encodePath: function(path) {
      //TODO: this is a random hex encoding decide and document on reasonable
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


    listByPrefix: function(prefix) {
      entries = SFAFS.benchmark(
        'getAll', 
        () => {return storageFoundation.getAllSync();}
      );
      return entries.filter(name => name.startsWith(prefix))
    },

    // Caches open file handles to simulate opening a file multiple times.
    openFileHandles: {},

    /* Filesystem implementation (public interface) */

    createNode: function (parent, name, mode, dev) {
      SFAFS.debug('createNode', arguments);
      if (!FS.isDir(mode) && !FS.isFile(mode)) {
        throw new FS.ErrnoError({{{ cDefine('EINVAL') }}});
      }
      var node = FS.createNode(parent, name, mode);
      node.node_ops = SFAFS.node_ops;
      node.stream_ops = SFAFS.stream_ops;
      if (FS.isDir(mode)) {
        node.contents = {};
      }
      node.timestamp = Date.now();
      return node;
    },

    mount: function (mount) {
      SFAFS.debug('mount', arguments);
      return SFAFS.createNode(null, '/', {{{ cDefine('S_IFDIR') }}} | 511 /* 0777 */, 0);
    },

    cwd: function() { return process.cwd(); },

    chdir: function() { process.chdir.apply(void 0, arguments); },

    allocate: function() {
      SFAFS.debug('allocate', arguments);
      throw new FS.ErrnoError({{{ cDefine('EOPNOTSUPP') }}});
    },

    ioctl: function() {
      SFAFS.debug('ioctl', arguments);
      throw new FS.ErrnoError({{{ cDefine('ENOTTY') }}});
    },

    /* Operations on the nodes of the filesystem tree */

    node_ops: {
      getattr: function(node) {
        SFAFS.debug('getattr', arguments);
        let length;
        if (node.handle) {
          length = SFAFS.benchmark(
            'getLength', 
            () => {return node.handle.getLength();}
          );
        } 
        else {
          // TODO: this double caching of opened files is probably redundant.
          // Clean up after publishing a clean design for the FS.
          var path = SFAFS.realPath(node);
          if(path in SFAFS.openFileHandles) {
            var fileHandle = SFAFS.openFileHandles[path]
            length = SFAFS.benchmark(
              'getLength', 
              () => {return fileHandle.getLength();}
            );
          } 
          else {
            let fileHandle = SFAFS.benchmark(
              'open', 
              () => {return storageFoundation.openSync(SFAFS.encodePath(path));}
            );
            length = SFAFS.benchmark(
              'getLength', 
              () => {return fileHandle.getLength();}
            );
            SFAFS.benchmark(
              'close', 
              () => {fileHandle.close();}
            );  
          }
        }

        let modificationTime = new Date(node.timestamp);
        return {
          dev: null,
          ino: null,
          mode: node.mode,
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
      },

      setattr: function(node, attr) {
        SFAFS.debug('setattr', arguments);
        if (attr.mode !== undefined) {
          node.mode = attr.mode;
        }
        if (attr.timestamp !== undefined) {
          node.timestamp = attr.timestamp;
        }
        if (attr.size !== undefined) {
          let useOpen = false;
          let handle = node.handle;
          try {
            if (!handle) {
              // Open a handle that is closed later.
              useOpen = true;
              handle = SFAFS.benchmark(
                'open', 
                () => {return storageFoundation.openSync(SFAFS.encodedPath(node));}
              );
            }SFAFS.benchmark(
              'setLength', 
              () => {handle.setLength(attr.size);}
            );
            
          } catch (e) {
            if (!('code' in e)) throw e;
            throw new FS.ErrnoError(-e.errno);
          } finally {
            if (useOpen && handle) {
              SFAFS.benchmark(
                'close', 
                () => {handle.close();}
              );  
            }
          }
        }
      },

      lookup: function (parent, name) {
        SFAFS.debug('lookup', arguments);
        var parentPath = SFAFS.directoryPath(SFAFS.realPath(parent));

        var children = SFAFS.listByPrefix(parentPath);

        var exists = false;
        var mode = 511 /* 0777 */
        for (var i = 0; i < children.length; ++i) {
          var path = children[i].substr(parentPath.length);
          if (path == name) {
            exists = true;
            mode |= {{{ cDefine('S_IFREG') }}};
            break;
          }

          subdirName = SFAFS.directoryPath(name);
          if (path.startsWith(subdirName)) {
            exists = true;
            mode |= {{{ cDefine('S_IFDIR') }}};
            break;
          }
        }

        if (!exists) {
          throw FS.genericErrors[{{{ cDefine('ENOENT') }}}];
        }

        var node = FS.createNode(parent, name, mode);
        node.node_ops = SFAFS.node_ops;
        node.stream_ops = SFAFS.stream_ops;
        return node;
      },

      mknod: function (parent, name, mode, dev) {
        SFAFS.debug('mknod', arguments);
        var node = SFAFS.createNode(parent, name, mode, dev);
        if (!FS.isFile) {
          console.log('SFAFS error: mknod is only implemented for files')
          throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
        }

        node.handle = null;
        node.refcount = 0;
        return node;
      },

      rename: function (oldNode, newParentNode, newName) {
        SFAFS.debug('rename', arguments);
        console.log('SFAFS error: rename is not implemented')
        throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
      },

      unlink: function(parent, name) {
        SFAFS.debug('unlink', arguments);
        var path = SFAFS.joinPaths(SFAFS.realPath(parent), name);
        SFAFS.benchmark(
          'delete', 
          () => {return storageFoundation.deleteSync(SFAFS.encodePath(path));}
        );
      },

      rmdir: function(parent, name) {
        SFAFS.debug('rmdir', arguments);
        console.log('SFAFS error: rmdir is not implemented')
        throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
      },

      readdir: function(node) {
        SFAFS.debug('readdir', arguments);
        var parentPath = SFAFS.realPath(node);
        var children = SFAFS.listByPrefix(SFAFS.encodePath(parentPath));
        children = children.map(child => SFAFS.extractFilename(parentPath, child));
        // Remove duplicates.
        return Array.from(new Set(children));
      },

      symlink: function(parent, newName, oldPath) {
        console.log('SFAFS error: symlink is not implemented')
        throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
      },

      readlink: function(node) {
        console.log('SFAFS error: readlink is not implemented')
        throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
      },
    },

    /* Operations on file streams (i.e., file handles) */

    stream_ops: {
      open: function (stream) {
        SFAFS.debug('open', arguments);
        if (!FS.isFile(stream.node.mode)) {
          console.log('SFAFS error: open is only implemented for files')
          throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
        }

        if (stream.node.handle) {
          //TODO: check when this code path is actually executed, it seems to
          //duplicate some of the caching behavior below.
          stream.handle = stream.node.handle;
          ++stream.node.refcount;
        } else {
          var path = SFAFS.realPath(stream.node);

          // Open existing file.
          if(!(path in SFAFS.openFileHandles)) {
            SFAFS.openFileHandles[path] = SFAFS.benchmark(
              'open', 
              () => {return storageFoundation.openSync(SFAFS.encodePath(path));}
            );
          }
          stream.handle = SFAFS.openFileHandles[path];
          stream.node.handle = stream.handle;
          stream.node.refcount = 1;
        }
      },

      close: function (stream) {
        SFAFS.debug('close', arguments);
        if (!FS.isFile(stream.node.mode)) {
          console.log('SFAFS error: close is only implemented for files');
          throw new FS.ErrnoError({{{ cDefine('ENOSYS') }}});
        }

        stream.handle = null;
        --stream.node.refcount;
        if (stream.node.refcount <= 0) {
          SFAFS.benchmark(
            'close', 
            () => {stream.node.handle.close();}
          );
          stream.node.handle = null;
          delete SFAFS.openFileHandles[SFAFS.realPath(stream.node)];
        }
      },

      fsync: function(stream) {
        SFAFS.debug('fsync', arguments);
        if (stream.handle == null) {
          throw new FS.ErrnoError({{{ cDefine('EBADF') }}});
        }
        stream.handle.flush();
        return 0;
      },

      read: function (stream, buffer, offset, length, position) {
        SFAFS.debug('read', arguments);
        let data = new Uint8Array(length);
<<<<<<< HEAD
        let result = SFAFS.benchmark(
          'read', 
          () => {return stream.handle.read(data, position);}
        );
=======
        let result = stream.handle.read(data, position);
>>>>>>> 92b0ec132a4ed6a3c9c7b0920b2f43267c2cc5fc
        buffer.set(result.buffer, offset);
        return result.readBytes;
      },

      write: function (stream, buffer, offset, length, position) {
        SFAFS.debug('write', arguments);
        stream.node.timestamp = Date.now();
        let data = new Uint8Array(buffer.slice(offset, offset+length));
<<<<<<< HEAD
        let result = SFAFS.benchmark(
          'write', 
          () => {return stream.handle.write(data, position);}
        );
=======
        let result = stream.handle.write(data, position);
>>>>>>> 92b0ec132a4ed6a3c9c7b0920b2f43267c2cc5fc
        return result.writtenBytes;
      },

      llseek: function (stream, offset, whence) {
        SFAFS.debug('llseek', arguments);
        var position = offset;
        if (whence === 1) {  // SEEK_CUR.
          position += stream.position;
        } else if (whence === 2) {  // SEEK_END.
          position += stream.handle.getLength();
        } else if (whence !== 0) {  // SEEK_SET.
          throw new FS.ErrnoError({{{ cDefine('EINVAL') }}});
        }

        if (position < 0) {
          throw new FS.ErrnoError({{{ cDefine('EINVAL') }}});
        }
        stream.position = position;
        return position;
      },

      mmap: function(stream, buffer, offset, length, position, prot, flags) {
        SFAFS.debug('mmap', arguments);
        throw new FS.ErrnoError({{{ cDefine('EOPNOTSUPP') }}});
      },

      msync: function(stream, buffer, offset, length, mmapFlags) {
        SFAFS.debug('msync', arguments);
        throw new FS.ErrnoError({{{ cDefine('EOPNOTSUPP') }}});
      },

      munmap: function(stream) {
        SFAFS.debug('munmap', arguments);
        throw new FS.ErrnoError({{{ cDefine('EOPNOTSUPP') }}});
      },
    }
  }
});
