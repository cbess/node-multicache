/*
Copyright (c) 2013 Christopher Bess

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 refs:
 https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/JSON/parse
 */

// cache type
var CTYPE = {
    // memcached cache backend
    // ref: https://github.com/elbart/node-memcache
    MEMCACHED: 'memcache',
    // in-memory cache, for the calling node instance
    // ref: https://github.com/tcs-de/nodecache
    MEMORY: 'node-cache',
    // redis backend
    // ref: https://github.com/mranney/node_redis
    REDIS: 'redis'
};

/**
 * Called one an operation is complete, passing in a single result value.
 * @callback defaultCallback
 * @param {*} object
 */

/**
 * Creates a cache exception.
 * @class Provides an exception wrapper for cache operations errors.
 * @param {string} msg - The message in the exception.
 * @constructor
 */
function CacheException(msg) {
    this.name = "CacheException";
    this.message = msg;
    this.toString = function() {
        return this.name + " - " + this.message;
    };
}

/**
 @class Represents Cache object
 @param {object} options
 name => String // name of this cache object (human-readable)
 type => CTYPE,
 hash => 'sha1', 'md5', null,
 port => Number,
 host => String
 */
function Cache(options) {
    this.cacheName = options.name;
    this.cache = null;
    this.error = null;
    this.ctype = null;
    this.debug = false;
    this.hash = null;
    this.module = null;
    this.options = options;

    // determine the hash to use for the keys
    switch (options.hash) {
        case 'sha1':
            // https://npmjs.org/package/sha1
            var sha1 = require('sha1');
            this.hash = sha1;
            break;

        case 'md5':
            // https://npmjs.org/package/MD5
            var md5 = require('MD5');
            this.hash = md5;
            break;
    }

    // determine the hash to use for the keys
    this.ctype = options.type;
    switch (options.type) {
        case CTYPE.MEMCACHED:
            var mMemcached = require(this.ctype);
            var memcached = new mMemcached.Client(options.port || 11211, options.host || '127.0.0.1');

            this.module = mMemcached;
            this.cache = memcached;
            break;

        case CTYPE.MEMORY:
            var NodeCache = require(this.ctype);
            var memory = new NodeCache();

            this.module = NodeCache;
            this.cache = memory;
            break;

        case CTYPE.REDIS:
            this.module = require(this.ctype);
            break;

        default:
            this.ctype = null;
            throw new CacheException("no cache type for: " + options.type);
    }
}

// Output `msg` to console
Cache.prototype.log = function(msg) {
    if (this.debug) {
        var prefix = '';
        var name = this.cacheName || prefix;
        if (name)
            prefix = name + ': ';

        require('util').debug(prefix + msg);
    }
};

/**
 Connect to the cache backend
 @param {defaultCallback} callback - callback(bool:success)
 */
Cache.prototype.connect = function(callback) {
    var self = this;
    if (!callback) {
        // no op
        callback = function(arg) {};
    }

    switch (this.ctype) {
        case CTYPE.MEMCACHED:
            this.cache.on('connect', function() {
                self.log('connected to memcached');
                callback(true);
            });

            this.cache.on('close', function() {
                self.log('closed connection');
                callback(false);
            });

            this.cache.on('timeout', function() {
                // no arguments - socket timed out
                callback(false);
            });

            this.cache.on('error', function(error) {
                self.log(error);
            });

            this.cache.connect();
            break;

        case CTYPE.MEMORY:
            // i'm sure memory connects immediately
            callback(true);
            break;

        case CTYPE.REDIS:
            this.module.debug_mode = this.debug;
            this.cache = this.module.createClient(this.options.port, this.options.host);
            this.cache.on('connect', function() {
                self.log('connected to redis');
                callback(true);
            });

            var funcFalse = function funcFalse(success) {
                self.log('unable to connect to redis');
                callback(success);
            };
            this.cache.on('error', funcFalse);
            this.cache.on('end', funcFalse);
            break;
    }
};

/**
 Set a value in the cache
 @param {number} expiration - number of milliseconds until key is expired
 @param {string} key
 @param {object|string} value
 @param {defaulCallback} callback - callback(bool:success|cached)
 */
Cache.prototype.set = function(key, value, expiration, callback) {
    var self = this;
    var hashedKey = key;
    if (this.hash) {
        hashedKey = this.hash(key);
    }

    if (!callback) {
        // no op
        callback = function(arg) {};
    }

    // change the object to json to make it cache safe
    if (this.ctype != CTYPE.MEMORY) {
        if (typeof value == 'object')
            value = JSON.stringify(value);
        else if (typeof value == 'string')
            value = '"' + value + '"'; // make to JSON safe string
    }

    switch (this.ctype) {
        case CTYPE.MEMORY:
            this.cache.set(hashedKey, value, expiration, function(err, success) {
                self.error = err;
                callback(success);
            });
            break;

        case CTYPE.MEMCACHED:
            this.cache.set(hashedKey, value, function(err, success) {
                self.error = err;
                callback(success)
            }, expiration);
            break;

        case CTYPE.REDIS:
            this.cache.set(key, value);
            callback(true);
            break;
    }
};

/**
 Get a value from the cache.
 @param {string} key
 @param {defaultCallback} callback - callback(object)
 */
Cache.prototype.get = function(key, callback) {
    var self = this;
    var hashedKey = key;
    if (this.hash)
        hashedKey = this.hash(key);

    switch (this.ctype) {
        case CTYPE.MEMORY:
            this.cache.get(hashedKey, function(err, result) {
                self.error = err;
                callback(result ? result[hashedKey] : null);
            });
            break;

        case CTYPE.MEMCACHED:
            this.cache.get(hashedKey, function(err, result) {
                self.error = err;
                result = JSON.parse(result);
                callback(result);
            });
            break;

        case CTYPE.REDIS:
            this.cache.get(hashedKey, function(err, reply) {
                self.error = err;
                if (!reply) {
                    callback(null);
                    return;
                }

               callback(JSON.parse(reply.toString()));
            });
            break;
    }
};

// noinspection JSUnusedLocalSymbols
Cache.prototype.del = function(key, callback) {
    throw 'Cache.del not implemented';
};
// alias for `Cache.del`
Cache.prototype.delete = Cache.del;

/**
 * Disconnects or ends the connection for the cache backend.
 * Must call `connect` again for subsequent cache operations.
 */
Cache.prototype.disconnect = function() {
    switch (this.ctype) {
        case CTYPE.REDIS:
            this.cache.end();
            break;
    }
};

exports.Cache = Cache;
exports.CTYPE = CTYPE;
exports.CacheException = CacheException;
