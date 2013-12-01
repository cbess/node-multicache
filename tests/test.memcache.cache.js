// test Memcache
var mCache = require('../multicache');

exports.testMemcachedObject = function(test) {
    try {
        require(mCache.CTYPE.MEMCACHED);
    } catch (e) {
        test.done();
        return;
    }

    test.expect(3);

    var memcached = new mCache.Cache({type: mCache.CTYPE.MEMCACHED, hash: 'md5'});
    var key = 'test key';
    var tObject = {obj: 'test value'};

    memcached.connect(function(connected) {
        test.ok(connected, 'unable to connect to memcached');

        // set the key-value
        memcached.set(key, tObject, 200, function(success) {
           test.ok(success, 'unable to set the memcached value');

            // get the object
            memcached.get(key, function(result) {
                test.equal(tObject.obj, result.obj, 'wrong object from memcached');
                test.done();
            });
        });
    });
};

exports.testMemcachedString = function(test) {
    try {
        require(mCache.CTYPE.MEMCACHED);
    } catch (e) {
        test.done();
        return;
    }

    test.expect(3);

    var memcached = new mCache.Cache({type: mCache.CTYPE.MEMCACHED, hash: 'md5'});
    var key = 'test key';
    var tObject = 'a string';

    memcached.connect(function(connected) {
        test.ok(connected, 'unable to connect to memcached');

        // now set string
        memcached.set(key, tObject, 200, function(success) {
            test.ok(success, 'unable to store the string');

            // get the string
            memcached.get(key, function(result) {
                test.equal(tObject, result);
                test.done();
            });
        });
    });
};
