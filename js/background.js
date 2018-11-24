'use strict';

let stands = {};

const observeStandsRequest = (e) => {
  if (e.currentTarget.readyState === XMLHttpRequest.DONE) {
    stands = e.currentTarget.response;
  }
}

const parseQuery = (text) => {
  return new Promise((resolve, reject) => {
    let chunks = text.split(/ /ig).filter(chunk => !!chunk);

    resolve({
      branch: (chunks[0] || '').toLowerCase(),
      query: (chunks[1] || '').toLowerCase()
    });
  });
};

const getSuggests = (qs) => {
  let node;

  if (
    qs.branch.match(/([0-9]+\-)+[0-9]+/)
    || qs.branch == 'develop'
    || qs.branch == 'master'
  ) {
    node = "";
  } else {
    let matches = qs.branch.match(/([a-z]+)\-[0-9]/);

    if (matches) {
      node = matches[1].toUpperCase();
    }
  }
  
  return new Promise((resolve, reject) => {
    resolve(
      qs.query 
        ? Object.keys(stands)
          .filter((key) => key === node || node === '')
          .map((key) => {
            let project = stands[key].project;

            return stands[key].domains
              .filter((domain) => domain.match(qs.query))
              .map((domain) => {
                let list = [domain];

                if (key == 'ESITE') {
                  if (domain.substr(0, 3) !== "bo.") {
                    list = list.concat([
                      'new.' + domain,
                      'new.bo.' + domain
                    ]);
                  }
                }

                return list.map((domain) => `https://${qs.branch}-${domain.replace(/\./g, '-')}.old.${project}.aservices.tech`);
              })
              .reduce((a, b) => a.concat(b), [])
          })
          .reduce((a, b) => a.concat(b), [])
          .map((domain) => {
            return { 
              content: domain, 
              description: domain
            };
          })
        : []
    );
  })
}

const xhr = new XMLHttpRequest();
xhr.onreadystatechange = observeStandsRequest;
xhr.responseType = "json";
xhr.open("GET", chrome.extension.getURL('../data/stands.json'), true);
xhr.send();

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  parseQuery(text)
    .then(getSuggests)
      .then(suggest);
});

chrome.omnibox.onInputEntered.addListener((text, sender) => {
  chrome.tabs.getSelected(null, (tab) => {
    chrome.tabs.update(tab.id, { url: text });
  });
});