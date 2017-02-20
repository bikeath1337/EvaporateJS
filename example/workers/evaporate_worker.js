"use strict";

importScripts('http://localhost/~bobbywallace/EvaporateJS/evaporate.js', 'https://sdk.amazonaws.com/js/aws-sdk-2.4.13.min.js')

var Evaporate = _evaporate_hey

var WebWorker = function () {};
WebWorker.prototype.config = undefined;
WebWorker.prototype._evaporate = undefined;
WebWorker.prototype.create = function (config) {
  var evapConfig = Object.assign({}, config, {
    cryptoMd5Method: function (data) { return AWS.util.crypto.md5(data, 'base64'); },
    cryptoHexEncodedHash256: function (data) { return AWS.util.crypto.sha256(data, 'hex'); }
  });
  var thisWorker = this;
  Evaporate.create(evapConfig)
      .then(function (e) {
        thisWorker.config = config;
        thisWorker._evaporate = e;
        self.postMessage({ msg: 'Evaporate created!' });
      })
      .catch(function (reason) {
        self.postMessage({ error: true, msg: 'Failed to create Evaporate: ' + reason } );
        self.close();
  });
};
WebWorker.prototype.add = function (file, pConfig) {
  var addConfig = Object.assign({}, pConfig, {
    progress: function (p, b) { console.log('Progress', p, b); }
  })
  this._evaporate.add(file, pConfig)
      .then(function (objectKey) {
        self.postMessage( { cmd: 'add', s3ObjectKey: objectKey} );
      })
      .catch(function (reason) {
        self.postMessage({error: true, msg: 'Failed to add: ' + reason} );
      });
};
WebWorker.prototype.pause = function (id, options) { return this._evaporate.pause(id, options); };
WebWorker.prototype.resume = function (id) { return this._evaporate.resume(id); };
WebWorker.prototype.cancel = function (id) {
  this._evaporate.cancel(id)
      .then(function () {
        self.postMessage( { cmd: 'cancel', msg: 'Canceled'} );
      })
      .catch(function (reason) {
        self.postMessage({error: true, msg: 'Failed to cancel: ' + reason} );
      });
};
// WebWorker.prototype.progress = function (id) { return this._evaporate.cancel(id); };

var worker = new WebWorker();

self.addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
    case 'create':
      worker.create(data.config);
      break;
    case 'add':
      var c = {
        name: data.name,
        file: data.file
      };
      worker.add(c);
      self.postMessage('Added ' + c);
      // self.postMessage('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
      // self.close(); // Terminates the worker.
      break;
    case 'pause':
      worker.pause(data.id, data.options);
      // self.postMessage('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
      // self.close(); // Terminates the worker.
      break;
    case 'resume':
      worker.resume(data.id);
      // self.postMessage('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
      // self.close(); // Terminates the worker.
      break;
    case 'cancel':
      worker.cancel(data.id);
      // self.postMessage('WORKER STOPPED: ' + data.msg + '. (buttons will no longer work)');
      // self.close(); // Terminates the worker.
      break;
    default:
      self.postMessage('Unknown command: ' + data.msg);
  }

}, false);