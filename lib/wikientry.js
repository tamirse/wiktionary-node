"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var unirest = require("unirest");
var cheerio = require("cheerio");

//wiki
var speech = ["Noun", "Pronoun", "Adjectives", "Numerals", "Verb", "Adverb", "Article", "Preposition", "Conjunction", "Interjection", "Abbreviation"];
var patch = function patch(re, s) {
  re = eval("/" + re + "/ig");
  var k = s.match(re);
  if (k) {
    return k.length;
  } else {
    return 0;
  }
};

var verify_word = function verify_word(word) {
  return new Promise(function (resolve, reject) {
    var req = unirest("GET", "https://en.wiktionary.org/w/api.php");
    req.query({
      action: "query",
      list: "search",
      format: "json",
      utf8: "",
      srprop: "",
      srsearch: word,
      srwhat: "nearmatch"
    });
    req.headers({
      "postman-token": "c2b2280b-1b34-22f5-f96c-a07ad89c1713",
      "cache-control": "no-cache"
    });
    req.end(function (res) {
      if (res.error) reject(res.error);

      var data = null;

      if (res.body !== undefined && res.body.query !== undefined) {
        data = res.body.query.search;
      }

      if (data === null) {
        reject({ info: "error" });
      } else if (data.length == 0) {
        reject({ info: "word does not exist" });
      } else {
        resolve(data[0].title);
      }
    });
  });
};

var get_wiki_entry = function get_wiki_entry(word, searchLanguage) {
  return new Promise(function (resolve, reject) {
    var req = unirest("GET", "https://en.wiktionary.org/w/index.php");
    req.query({ title: word, printable: "yes" });
    req.headers({
      "postman-token": "ebdb9090-7be1-6aeb-b7fb-7f68eb7a4202",
      "cache-control": "no-cache"
    });
    req.end(function (res) {
      if (res.error) {
        reject(res.error);
        return;
      }
      if (res.body === undefined) {
        reject("error");
        return;
      }

      var dictionary = {
        word: word,
        language: "en",
        definitions: []
      };

      var $ = cheerio.load(res.body);
      var count = 0;
      var searchLanguagePosition = null;

      // check if value contains parts of speech?
      $(".toc").find(".toclevel-1").each(function (i, elem) {
        // get current element language string
        var language = $(elem).text().substr(2, searchLanguage.length);

        // only check the element that matches search language
        if (language === searchLanguage) {
          var text = $(elem).text();
          searchLanguagePosition = i; // mark the position of the correct search language data
          for (var x in speech) {
            count += patch(speech[x], text);
          }
        } else {
          return;
        }
      });

      // get content from element that matches the search language
      $(".mw-parser-output").find("ol").each(function (i, elem) {
        if (searchLanguagePosition === i) {
          $(elem).find("ul").empty();

          // get current part of speech
          var curspeech = $(elem).prev().prev().text();

          var oneDefinition = {
            speech: curspeech,
            lines: []
          };

          // get the definitions for the current part of speech
          $(elem).children().each(function (i1, elem1) {
            var print = $(elem1).text().split("\n");

            var oneLine = {
              define: "",
              examples: []
            };

            for (var x in print) {
              if (x == 0) {
                oneLine["define"] = print[x];
              } else {
                if (print[x]) {
                  oneLine["examples"].push(print[x]);
                }
              }
            }

            oneDefinition["lines"].push(oneLine);
          });
          dictionary["definitions"].push(oneDefinition);
        }
      });
      resolve(dictionary);
    });
  });
};

var wiki = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(word, searchLanguage) {
    var word1, dict;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return verify_word(word);

          case 3:
            word1 = _context.sent;
            _context.next = 6;
            return get_wiki_entry(word1, searchLanguage);

          case 6:
            dict = _context.sent;
            return _context.abrupt("return", dict);

          case 10:
            _context.prev = 10;
            _context.t0 = _context["catch"](0);
            return _context.abrupt("return", Promise.reject(_context.t0));

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined, [[0, 10]]);
  }));

  return function wiki(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

module.exports = wiki;