var fs = require('fs');
var events = require('events');
var iconv = require('iconv-lite');

var readline = function(path, bufferSize, encoding, lineEnding) {
  this.bufferSize = bufferSize || 8000;
  this.encoding = encoding || 'utf8';
  this.lineEnding = lineEnding || '\n';
  this.pos = 0;
  this.cache = [];
  this.fd; //file descriptor
  this.buffer = new Buffer(this.bufferSize);
  this.fileSize;
  this.leftover = '';

  fs.stat(path, function(err, stat) {
    if (err) {
      this.emit('error', err);
    } else {
      this.fileSize = stat.size;
      fs.open(path, 'r', function(err, fileDesc) {
        if (err) {
          this.emit('error', err);
        } else {
          this.fd = fileDesc;
          this.emit('open', fileDesc);
        }
      }.bind(this));
    }
  }.bind(this));
};

module.exports = readline;

readline.prototype = new events.EventEmitter();

readline.prototype.read = function() {
  var fileSize = this.fileSize;
  var remeaning = fileSize - this.pos;
  var len, textRead;
  if (this.cache.length >= 1) {
    this.emit('line', this.cache.shift(), this.read.bind(this));
  } else {
    if (remeaning == 0) {
      this.emit('end');
    } else {
      len = (this.pos + this.bufferSize >= fileSize) ? remeaning : this.bufferSize;
      fs.read(this.fd, this.buffer, 0, len, this.pos, function(err, bytesRead) {
        this.pos += len;
        textRead = iconv.decode(this.buffer.slice(0, bytesRead), this.encoding);
        this.cache = textRead.split(this.lineEnding);
        this.cache[0] = this.leftover + this.cache[0];
        this.leftover = this.cache.pop();
        this.read();
      }.bind(this));
    }
  }
};

readline.prototype.close = function(callback) {
  fs.close(this.fd, function(err) {
    if (err) {
      this.emit('error', err);
      callback(err);
    } else {
      callback();
    }
  }.bind(this));
};

