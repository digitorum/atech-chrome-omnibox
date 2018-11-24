'use strict';

/**
 * Словарь со списком стэндов.
 * 
 * @type {object}
 */
let stands = {};

/**
 * Загрузить спракочник стэндов
 * 
 * @param {string} url
 * @returns {Promise} 
 */
const loadStandsData = (url) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = (e) => {
      if (e.currentTarget.readyState === XMLHttpRequest.DONE) {
        if (e.currentTarget.response) {
          resolve(e.currentTarget.response);
        } else {
          reject();
        }
      };
    }
    xhr.onerror = reject;
    xhr.onabort = reject;
    xhr.responseType = 'json';
    xhr.open('GET', url, true);
    xhr.send();
  })
}

/**
 * Разобрать вводимое пользователем значение для получение бранча и домена проекта.
 * 
 * @param {string} text 
 * @returns {Promise}
 */
const parseQuery = (text) => {
  return new Promise((resolve, reject) => {
    let chunks = text.split(/ /ig).filter(chunk => !!chunk);

    resolve({
      branch: (chunks[0] || '').toLowerCase(),
      query: (chunks[1] || '').toLowerCase()
    });
  });
};

/**
 * Сформировать список подсказок
 * 
 * @param {object} qs
 * @returns {Promise}
 */
const getSuggests = (qs) => {
  return new Promise((resolve) => {
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

                return list.map((domain) => ({
                  branch: qs.branch,
                  domain: domain,
                  project: project
                }));
              })
              .reduce((a, b) => a.concat(b), [])
          })
          .reduce((a, b) => a.concat(b), [])
          .map((data) => {
            const domain = data.domain.replace(/\./g, '-');

            return { 
              content: `https://${data.branch}-${domain}.old.${data.project}.aservices.tech`, 
              description: `<url>${data.branch}-${domain}.old.${data.project}.aservices.tech</url> - ${data.domain}`
            };
          })
        : []
    );
  })
}

// Пробуем получить копию данных с гитхаба.
// Если не получилось, читаем локальный файл.
loadStandsData('https://raw.githubusercontent.com/digitorum/stand-omnibox/master/data/stands.json').then((response) => {
  stands = response;
}, () => {
  loadStandsData(chrome.extension.getURL('../data/stands.json')).then((response) => {
    stands = response;
  }, () => {
    stands = {};
  })
});

// Реакция на ввод пользователя.
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  parseQuery(text)
    .then(getSuggests)
      .then(suggest);
});

// Реакция на выбор пользователя.
chrome.omnibox.onInputEntered.addListener((text, sender) => {
  chrome.tabs.getSelected(null, (tab) => {
    chrome.tabs.update(tab.id, { url: text });
  });
});