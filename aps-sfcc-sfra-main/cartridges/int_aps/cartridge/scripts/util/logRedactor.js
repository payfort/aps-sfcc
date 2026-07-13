'use strict';

/**
 * Shared log redaction utility for APS service communication logs.
 *
 * SFCC's LocalServiceRegistry writes `getRequestLogMessage`, `getResponseLogMessage`,
 * `getErrorLogMessage`, and `filterLogMessage` output to `service-<prefix>-*.log`
 * whenever `<comm-log-enabled>true</comm-log-enabled>` is set in `services.xml`.
 * Those log files are readable in Business Manager (Administration >
 * Site Development > Development Setup > Log Files) and via WebDAV, and are
 * frequently forwarded to downstream log aggregation systems.
 *
 * The APS purchase and Apple Pay services carry, for every saved-card
 * transaction:
 *   - `card_security_code` (CVV) -- storage after authorization is prohibited
 *     by PCI-DSS requirement 3.2 in ANY form, including log files.
 *   - `token_name` -- APS vault token; combined with `access_code`, it
 *     authorizes charges against the stored card.
 *   - `access_code`, `merchant_identifier`, `signature` -- merchant API
 *     credentials and the SHA of the request.
 *   - `customer_email`, `customer_ip`, `card_holder_name`, `card_number`,
 *     `card_bin`, `expiry_date` -- PII.
 *   - `apple_data`, `apple_signature`, `apple_header` -- Apple Pay payload.
 *
 * This module scrubs those fields from any string that may reach the log
 * pipeline, whether it originated as a JSON body, a URL-encoded form body, or
 * a query string. Redaction operates purely on the log-facing string; it does
 * NOT mutate the outbound request that is actually delivered to APS.
 */

// Fields whose values must be completely erased before reaching the log.
var FULL_MASK_KEYS = [
    'card_security_code',
    'token_name',
    'access_code',
    'merchant_identifier',
    'signature',
    'apple_data',
    'apple_signature',
    'apple_header',
    'apple_paymentMethod',
    'sha_request_phrase',
    'sha_response_phrase',
    'customer_ip',
    'phone_number'
];

// Fields where only the last four characters are preserved (PAN, BIN).
var LAST4_KEYS = [
    'card_number',
    'card_bin',
    'maskedNumber'
];

// Fields treated as email addresses (preserve first character and domain).
var EMAIL_KEYS = ['customer_email'];

// Fields treated as personal names (preserve first character of each token).
var NAME_KEYS = ['card_holder_name'];

function escapeForRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsonReplaceFull(input, key) {
    var pattern = new RegExp('("' + escapeForRegex(key) + '"\\s*:\\s*")[^"]*(")', 'g');
    return input.replace(pattern, '$1***$2');
}

function urlReplaceFull(input, key) {
    var pattern = new RegExp('(^|[?&\\s])(' + escapeForRegex(key) + '=)[^&\\s"\']*', 'g');
    return input.replace(pattern, '$1$2***');
}

function jsonReplaceLast4(input, key) {
    var pattern = new RegExp('("' + escapeForRegex(key) + '"\\s*:\\s*")([^"]*)(")', 'g');
    return input.replace(pattern, function (_m, prefix, value, suffix) {
        var trimmed = String(value).replace(/\s+/g, '');
        if (trimmed.length <= 4) {
            return prefix + '****' + suffix;
        }
        return prefix + '****' + trimmed.slice(-4) + suffix;
    });
}

function urlReplaceLast4(input, key) {
    var pattern = new RegExp('(^|[?&\\s])(' + escapeForRegex(key) + '=)([^&\\s"\']*)', 'g');
    return input.replace(pattern, function (_m, boundary, kv, value) {
        var decoded;
        try { decoded = decodeURIComponent(value); } catch (e) { decoded = value; }
        var trimmed = decoded.replace(/\s+/g, '');
        if (trimmed.length <= 4) {
            return boundary + kv + '****';
        }
        return boundary + kv + '****' + trimmed.slice(-4);
    });
}

function maskEmail(value) {
    var v = String(value);
    var at = v.indexOf('@');
    if (at < 1) return '***';
    return v.charAt(0) + '***' + v.slice(at);
}

function jsonReplaceEmail(input, key) {
    var pattern = new RegExp('("' + escapeForRegex(key) + '"\\s*:\\s*")([^"]*)(")', 'g');
    return input.replace(pattern, function (_m, prefix, value, suffix) {
        return prefix + maskEmail(value) + suffix;
    });
}

function urlReplaceEmail(input, key) {
    var pattern = new RegExp('(^|[?&\\s])(' + escapeForRegex(key) + '=)([^&\\s"\']*)', 'g');
    return input.replace(pattern, function (_m, boundary, kv, value) {
        var decoded;
        try { decoded = decodeURIComponent(value); } catch (e) { decoded = value; }
        return boundary + kv + encodeURIComponent(maskEmail(decoded));
    });
}

function maskName(value) {
    return String(value)
        .split(/\s+/)
        .filter(function (t) { return t.length > 0; })
        .map(function (t) { return t.charAt(0) + '***'; })
        .join(' ');
}

function jsonReplaceName(input, key) {
    var pattern = new RegExp('("' + escapeForRegex(key) + '"\\s*:\\s*")([^"]*)(")', 'g');
    return input.replace(pattern, function (_m, prefix, value, suffix) {
        return prefix + maskName(value) + suffix;
    });
}

function urlReplaceName(input, key) {
    var pattern = new RegExp('(^|[?&\\s])(' + escapeForRegex(key) + '=)([^&\\s"\']*)', 'g');
    return input.replace(pattern, function (_m, boundary, kv, value) {
        var decoded;
        try { decoded = decodeURIComponent(value); } catch (e) { decoded = value; }
        return boundary + kv + encodeURIComponent(maskName(decoded));
    });
}

/**
 * Redact sensitive fields from an arbitrary log string.
 *
 * Handles both JSON payloads (`"key":"value"`) and form-encoded / query
 * bodies (`key=value`). Never throws; on any error returns a placeholder.
 *
 * @param {string} input - raw log message
 * @returns {string} redacted log message
 */
function maskString(input) {
    if (input === null || typeof input === 'undefined') {
        return input;
    }
    try {
        var out = String(input);

        FULL_MASK_KEYS.forEach(function (k) {
            out = jsonReplaceFull(out, k);
            out = urlReplaceFull(out, k);
        });
        LAST4_KEYS.forEach(function (k) {
            out = jsonReplaceLast4(out, k);
            out = urlReplaceLast4(out, k);
        });
        EMAIL_KEYS.forEach(function (k) {
            out = jsonReplaceEmail(out, k);
            out = urlReplaceEmail(out, k);
        });
        NAME_KEYS.forEach(function (k) {
            out = jsonReplaceName(out, k);
            out = urlReplaceName(out, k);
        });

        return out;
    } catch (e) {
        return '[APS-LOG-REDACTION-FAILED]';
    }
}

/**
 * Redact sensitive fields from an object by round-tripping through
 * `maskString`. If the object is not JSON-serializable, the object is
 * returned unchanged.
 *
 * @param {*} obj - object or primitive
 * @returns {*} redacted structure
 */
function maskObject(obj) {
    try {
        return JSON.parse(maskString(JSON.stringify(obj)));
    } catch (e) {
        return obj;
    }
}

module.exports = {
    maskString: maskString,
    maskObject: maskObject
};
