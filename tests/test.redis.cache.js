// test Redis cache backend

var mCache = require('../multicache');

exports.testRedisObject = function(test) {
    try {
        require(mCache.CTYPE.REDIS);
    } catch (e) {
        test.done();
        return;
    }

    test.expect(3);

    var redis = new mCache.Cache({
        type: mCache.CTYPE.REDIS
    });
    redis.debug = true;

    var testKey = 'great';
    var tValue = {name: 'name here', 'id': '77'};

    redis.connect(function(connected) {
        test.ok(connected, 'unable to connect to redis backend');

        redis.set(testKey, tValue, 0, function(ok) {
            test.ok(ok, 'unable to set key');

            redis.get(testKey, function(result) {
                test.equals(result.name, tValue.name, 'wrong key value');
                test.done();
            });
        });
    });
};
