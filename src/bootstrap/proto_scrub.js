/**
 * Early proto scrub — remove any pre-existing non-writable txRoot on Object.prototype.
 */
(function () {
    try {
        var proto = Object.prototype;
        var d = Object.getOwnPropertyDescriptor(proto, 'txRoot');
        if (d) {
            try {
                delete proto.txRoot;
            }
            catch (_a) { }
            var d2 = Object.getOwnPropertyDescriptor(proto, 'txRoot');
            if (d2) {
                try {
                    Object.defineProperty(proto, 'txRoot', { value: undefined, writable: true, configurable: true });
                }
                catch (_b) { }
                try {
                    delete proto.txRoot;
                }
                catch (_c) { }
            }
        }
    }
    catch (_d) { }
})();
