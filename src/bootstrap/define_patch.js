/**
 * Must load FIRST. Intercepts defineProperty calls that try to put a non-writable
 * txRoot on Object.prototype, and forces it to stay writable/configurable.
 */
(function () {
    var orig = Object.defineProperty;
    var safe = function definePropertySafe(o, p, attributes) {
        try {
            if (o === Object.prototype && (p === 'txRoot' || p === 'filter')) {
                // Normalize any attempts to add txRoot/filter on Object.prototype
                var attrs = {};
                // Prefer data prop, coerce getters/setters to benign data
                if ('get' in attributes || 'set' in attributes) {
                    attrs.value = undefined;
                }
                else if ('value' in attributes) {
                    attrs.value = attributes.value;
                }
                else {
                    attrs.value = undefined;
                }
                attrs.writable = true;
                attrs.enumerable = false;
                attrs.configurable = true;
                return orig(o, p, attrs);
            }
        }
        catch (_a) {
            // Fallthrough to original on any error
        }
        return orig(o, p, attributes);
    };
    // Assign with correct typing
    Object.defineProperty = safe;
})();
