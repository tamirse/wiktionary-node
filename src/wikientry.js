const unirest = require("unirest");
const cheerio = require("cheerio");

//wiki
const speech = [
  "Noun",
  "Pronoun",
  "Adjectives",
  "Numerals",
  "Verb",
  "Adverb",
  "Article",
  "Preposition",
  "Conjunction",
  "Interjection",
  "Abbreviation"
];
const patch = (re, s) => {
  re = eval("/" + re + "/ig");
  let k = s.match(re);
  if (k) {
    return k.length;
  } else {
    return 0;
  }
};

const verify_word = word => {
  return new Promise((resolve, reject) => {
    const req = unirest("GET", "https://en.wiktionary.org/w/api.php");
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
    req.end(function(res) {
      if (res.error) reject(res.error);

      let data = null;

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

const get_wiki_entry = (word, searchLanguage) => {
  return new Promise((resolve, reject) => {
    const req = unirest("GET", "https://en.wiktionary.org/w/index.php");
    req.query({ title: word, printable: "yes" });
    req.headers({
      "postman-token": "ebdb9090-7be1-6aeb-b7fb-7f68eb7a4202",
      "cache-control": "no-cache"
    });
    req.end(function(res) {
      if (res.error) {
        reject(res.error);
        return;
      }
      if (res.body === undefined) {
        reject("error");
        return;
      }

      let dictionary = {
        word: word,
        language: "en",
        definitions: []
      };

      let $ = cheerio.load(res.body);
      let count = 0;
      let searchLanguagePosition = null;

      // check if value contains parts of speech?
      $(".toc")
        .find(".toclevel-1")
        .each(function(i, elem) {
          // get current element language string
          const language = $(elem)
            .text()
            .substr(2, searchLanguage.length);

          // only check the element that matches search language
          if (language === searchLanguage) {
            const text = $(elem).text();
            searchLanguagePosition = i; // mark the position of the correct search language data
            for (let x in speech) {
              count += patch(speech[x], text);
            }
          } else {
            return;
          }
        });

      // get content from element that matches the search language
      $(".mw-parser-output")
        .find("ol")
        .each(function(i, elem) {
          if (searchLanguagePosition === i) {
            $(elem)
              .find("ul")
              .empty();

            // get current part of speech
            let curspeech = $(elem)
              .prev()
              .prev()
              .text();

            let oneDefinition = {
              speech: curspeech,
              lines: []
            };

            // get the definitions for the current part of speech
            $(elem)
              .children()
              .each(function(i1, elem1) {
                let print = $(elem1)
                  .text()
                  .split("\n");

                let oneLine = {
                  define: "",
                  examples: []
                };

                for (let x in print) {
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

const wiki = async (word, searchLanguage) => {
  try {
    const word1 = await verify_word(word);
    const dict = await get_wiki_entry(word1, searchLanguage);
    return dict;
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = wiki;
