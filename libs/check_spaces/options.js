'use strict';

module.exports = {
  optional: true,
  //para incluir campos dentro de el
  object: true,
  //lo mismo que object, pero en array
  array: true,
  //array de objetos, apuntadores a campos
  arrayObject: true,
  //hace referencia a un campo
  toObject: true,
  //array normales
  arrayNormal: true,
  objectNormal: true,
  reverseLocation: true,
  reverseAddress: true,
  default: true,
  state: true,

  notEmpty: true,
  contains: true,
  equals: true,
  isAfter: {
    date: true
  },
  isAlpha: {
    locale: true
  },
  isAlphanumeric: {
    locale: true
  },
  isAscii: true,
  isBase64: true,
  isBefore: {
    date: true
  },
  isBoolean: true,
  isByteLength: {
    min: true,
    max: true
  },
  isCreditCard: true,
  isCurrency: {
    symbol: '$',
    require_symbol: true,
    allow_space_after_symbol: true,
    symbol_after_digits: true,
    allow_negatives: true,
    parens_for_negatives: true,
    negative_sign_before_digits: true,
    negative_sign_after_digits: true,
    allow_negative_sign_placeholder: true,
    thousands_separator: ',',
    decimal_separator: '.',
    allow_space_after_digits: true
  },
  isDataURI: true,
  isDate: true,
  isDecimal: true,
  isDivisibleBy: {
    number: true
  },
  isEmail: {
    allow_display_name: true,
    allow_utf8_local_part: true,
    require_tld: true
  },
  isFQDN: {
    require_tld: true,
    allow_underscores: true,
    allow_trailing_dot: true
  },
  isFloat: {
    min: true,
    max: true
  },
  isFullWidth: true,
  isHalfWidth: true,
  isHexColor: true,
  isHexadecimal: true,
  isIP: {
    version: true
  },
  isISBN: {
    version: true
  },
  isISIN: true,
  isISO8601: true,
  isIn: {
    values: true
  },
  isInt: {
    min: 10,
    max: 99,
    allow_leading_zeroes: true
  },
  isJSON: true,
  isLength: {
    min: true,
    max: true
  },
  isLowercase: true,
  isMACAddress: true,
  isMobilePhone: {
    locale: true
  },
  isMongoId: true,
  isMultibyte: true,
  isNull: true,
  isNumeric: true,
  isSurrogatePair: true,
  isURL: {
    protocols: true,
    require_tld: true,
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: true,
    host_whitelist: true,
    host_blacklist: true,
    allow_trailing_dot: true,
    allow_protocol_relative_urls: true
  },
  isUUID: {
    version: true
  },
  isUppercase: true,
  isVariableWidth: true,
  isWhitelisted: {
    chars: true
  },
  matches: {
    pattern: true,
    modifiers: true
  },
  errorMessage: true
};
