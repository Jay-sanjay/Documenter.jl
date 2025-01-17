// libraries: jquery, minisearch
// arguments: $, minisearch

// In general, most search related things will have "search" as a prefix.
// To get an in-depth about the thought process you can refer: https://hetarth02.hashnode.dev/series/gsoc

let results = [];
let timer = undefined;

let data = documenterSearchIndex["docs"].map((x, key) => {
  x["id"] = key; // minisearch requires a unique for each object
  return x;
});

// list below is the lunr 2.1.3 list minus the intersect with names(Base)
// (all, any, get, in, is, only, which) and (do, else, for, let, where, while, with)
// ideally we'd just filter the original list but it's not available as a variable
const stopWords = new Set([
  "a",
  "able",
  "about",
  "across",
  "after",
  "almost",
  "also",
  "am",
  "among",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "but",
  "by",
  "can",
  "cannot",
  "could",
  "dear",
  "did",
  "does",
  "either",
  "ever",
  "every",
  "from",
  "got",
  "had",
  "has",
  "have",
  "he",
  "her",
  "hers",
  "him",
  "his",
  "how",
  "however",
  "i",
  "if",
  "into",
  "it",
  "its",
  "just",
  "least",
  "like",
  "likely",
  "may",
  "me",
  "might",
  "most",
  "must",
  "my",
  "neither",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "often",
  "on",
  "or",
  "other",
  "our",
  "own",
  "rather",
  "said",
  "say",
  "says",
  "she",
  "should",
  "since",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "tis",
  "to",
  "too",
  "twas",
  "us",
  "wants",
  "was",
  "we",
  "were",
  "what",
  "when",
  "who",
  "whom",
  "why",
  "will",
  "would",
  "yet",
  "you",
  "your",
]);

let index = new minisearch({
  fields: ["title", "text"], // fields to index for full-text search
  storeFields: ["location", "title", "text", "category", "page"], // fields to return with search results
  processTerm: (term) => {
    let word = stopWords.has(term) ? null : term;
    if (word) {
      // custom trimmer that doesn't strip @ and !, which are used in julia macro and function names
      word = word
        .replace(/^[^a-zA-Z0-9@!]+/, "")
        .replace(/[^a-zA-Z0-9@!]+$/, "");

      word = word.toLowerCase();
    }

    return word ?? null;
  },
  // add . as a separator, because otherwise "title": "Documenter.Anchors.add!", would not find anything if searching for "add!", only for the entire qualification
  tokenize: (string) => string.split(/[\s\-\.]+/),
  // options which will be applied during the search
  searchOptions: {
    prefix: true,
    boost: { title: 100 },
    fuzzy: 2,
    processTerm: (term) => {
      let word = stopWords.has(term) ? null : term;
      if (word) {
        word = word
          .replace(/^[^a-zA-Z0-9@!]+/, "")
          .replace(/[^a-zA-Z0-9@!]+$/, "");

        word = word.toLowerCase();
      }

      return word ?? null;
    },
    tokenize: (string) => string.split(/[\s\-\.]+/),
  },
});

index.addAll(data);

let filters = [...new Set(data.map((x) => x.category))];
var modal_filters = make_modal_body_filters(filters);
var filter_results = [];

$(document).on("keyup", ".documenter-search-input", function (event) {
  // Adding a debounce to prevent disruptions from super-speed typing!
  debounce(() => update_search(filter_results), 300);
});

$(document).on("click", ".search-filter", function () {
  if ($(this).hasClass("search-filter-selected")) {
    $(this).removeClass("search-filter-selected");
  } else {
    $(this).addClass("search-filter-selected");
  }

  // Adding a debounce to prevent disruptions from crazy clicking!
  debounce(() => get_filters(), 300);
});

/**
 * A debounce function, takes a function and an optional timeout in milliseconds
 *
 * @function callback
 * @param {number} timeout
 */
function debounce(callback, timeout = 300) {
  clearTimeout(timer);
  timer = setTimeout(callback, timeout);
}

/**
 * Make/Update the search component
 *
 * @param {string[]} selected_filters
 */
function update_search(selected_filters = []) {
  let initial_search_body = `
      <div class="has-text-centered my-5 py-5">Type something to get started!</div>
    `;

  let querystring = $(".documenter-search-input").val();

  if (querystring.trim()) {
    results = index.search(querystring, {
      filter: (result) => {
        // Filtering results
        if (selected_filters.length === 0) {
          return result.score >= 1;
        } else {
          return (
            result.score >= 1 && selected_filters.includes(result.category)
          );
        }
      },
    });

    let search_result_container = ``;
    let search_divider = `<div class="search-divider w-100"></div>`;

    if (results.length) {
      let links = [];
      let count = 0;
      let search_results = "";

      results.forEach(function (result) {
        if (result.location) {
          // Checking for duplication of results for the same page
          if (!links.includes(result.location)) {
            search_results += make_search_result(result, querystring);
            count++;
          }

          links.push(result.location);
        }
      });

      let result_count = `<div class="is-size-6">${count} result(s)</div>`;

      search_result_container = `
            <div class="is-flex is-flex-direction-column gap-2 is-align-items-flex-start">
                ${modal_filters}
                ${search_divider}
                ${result_count}
                <div class="is-clipped w-100 is-flex is-flex-direction-column gap-2 is-align-items-flex-start has-text-justified mt-1">
                  ${search_results}
                </div>
            </div>
        `;
    } else {
      search_result_container = `
           <div class="is-flex is-flex-direction-column gap-2 is-align-items-flex-start">
               ${modal_filters}
               ${search_divider}
               <div class="is-size-6">0 result(s)</div>
            </div>
            <div class="has-text-centered my-5 py-5">No result found!</div>
       `;
    }

    if ($(".search-modal-card-body").hasClass("is-justify-content-center")) {
      $(".search-modal-card-body").removeClass("is-justify-content-center");
    }

    $(".search-modal-card-body").html(search_result_container);
  } else {
    filter_results = [];
    modal_filters = make_modal_body_filters(filters, filter_results);

    if (!$(".search-modal-card-body").hasClass("is-justify-content-center")) {
      $(".search-modal-card-body").addClass("is-justify-content-center");
    }

    $(".search-modal-card-body").html(initial_search_body);
  }
}

/**
 * Make the modal filter html
 *
 * @param {string[]} filters
 * @param {string[]} selected_filters
 * @returns string
 */
function make_modal_body_filters(filters, selected_filters = []) {
  let str = ``;

  filters.forEach((val) => {
    if (selected_filters.includes(val)) {
      str += `<a href="javascript:;" class="search-filter search-filter-selected"><span>${val}</span></a>`;
    } else {
      str += `<a href="javascript:;" class="search-filter"><span>${val}</span></a>`;
    }
  });

  let filter_html = `
        <div class="is-flex gap-2 is-flex-wrap-wrap is-justify-content-flex-start is-align-items-center search-filters">
            <span class="is-size-6">Filters:</span>
            ${str}
        </div>
    `;

  return filter_html;
}

/**
 * Make the result component given a minisearch result data object and the value of the search input as queryString.
 * To view the result object structure, refer: https://lucaong.github.io/minisearch/modules/_minisearch_.html#searchresult
 *
 * @param {object} result
 * @param {string} querystring
 * @returns string
 */
function make_search_result(result, querystring) {
  let search_divider = `<div class="search-divider w-100"></div>`;
  let display_link =
    result.location.slice(Math.max(0), Math.min(50, result.location.length)) +
    (result.location.length > 30 ? "..." : ""); // To cut-off the link because it messes with the overflow of the whole div

  if (result.page !== "") {
    display_link += ` (${result.page})`;
  }

  let textindex = new RegExp(`${querystring}`, "i").exec(result.text);
  let text =
    textindex !== null
      ? result.text.slice(
          Math.max(textindex.index - 100, 0),
          Math.min(
            textindex.index + querystring.length + 100,
            result.text.length
          )
        )
      : ""; // cut-off text before and after from the match

  let display_result = text.length
    ? "..." +
      text.replace(
        new RegExp(`${querystring}`, "i"), // For first occurrence
        '<span class="search-result-highlight py-1">$&</span>'
      ) +
      "..."
    : ""; // highlights the match

  let in_code = false;
  if (!["page", "section"].includes(result.category.toLowerCase())) {
    in_code = true;
  }

  // We encode the full url to escape some special characters which can lead to broken links
  let result_div = `
      <a href="${encodeURI(
        documenterBaseURL + "/" + result.location
      )}" class="search-result-link w-100 is-flex is-flex-direction-column gap-2 px-4 py-2">
        <div class="w-100 is-flex is-flex-wrap-wrap is-justify-content-space-between is-align-items-flex-start">
          <div class="search-result-title has-text-weight-bold ${
            in_code ? "search-result-code-title" : ""
          }">${result.title}</div>
          <div class="property-search-result-badge">${result.category}</div>
        </div>
        <p>
          ${display_result}
        </p>
        <div
          class="has-text-left"
          style="font-size: smaller;"
          title="${result.location}"
        >
          <i class="fas fa-link"></i> ${display_link}
        </div>
      </a>
      ${search_divider}
    `;

  return result_div;
}

/**
 * Get selected filters, remake the filter html and lastly update the search modal
 */
function get_filters() {
  let ele = $(".search-filters .search-filter-selected").get();
  filter_results = ele.map((x) => $(x).text().toLowerCase());
  modal_filters = make_modal_body_filters(filters, filter_results);
  update_search(filter_results);
}
