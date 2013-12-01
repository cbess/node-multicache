// Provides unit tests for the Cache module

var mCache = require('../multicache');

exports.testMemory = function(test) {
    try {
        require(mCache.CTYPE.MEMORY);
    } catch (e) {
        test.done();
        return;
    }

    test.expect(3);

    // no need for hashing, its a simple memory store
    var options = {type: mCache.CTYPE.MEMORY, hash: null};
    var memory = new mCache.Cache(options);
    var key = 'test key';
    var tObject = {obj: 'test value'};

    memory.connect(function (connected) {
        test.ok(connected, 'unable to connect to memory?');

        // set a value in cache
        memory.set(key, tObject, 200, function (success) {
            test.ok(success, 'unable to set the key');

            // retrieve that value
            memory.get(key, function (result) {
                test.equal(tObject.obj, result.obj, 'the retrieved key value is wrong');
                test.done();
            });
        });
    });
};

/*
var nodeunit = require('nodeunit');
exports.testTestCase = function (test) {
    var call_order = [];
    var s = {
        setUp: function (callback) {
            call_order.push('setUp');
            callback();
        },
        tearDown: function (callback) {
            call_order.push('tearDown');
            callback();
        },
        testMemcached: function (t) {
            call_order.push('testMemcached');
            t.done();
        },
        testMemory: function (t) {
            call_order.push('testMemory');
            t.done();
        }
    };
    nodeunit.runSuite(null, s, {}, function () {
        test.same(call_order, [
            'setUp', 'testMemcached', 'tearDown',
            'setUp', 'testMemory', 'tearDown'
        ]);
        test.done();
    });
};

exports.testSomething = function(test){
    test.expect(1);
    test.ok(true, "this assertion should pass");
    test.done();
};

exports.testSomethingElse = function(test){
//    test.ok(false, "this assertion should fail");
    test.done();
};
*/
