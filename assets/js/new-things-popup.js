// new-things-popup.js
// Modul, ami az "Új dolgok" ellenőrzést és a popup UI-t minden oldalra injektálja (home.css dizájn alapján)
// A működés megegyezik az index.html-ben lévő megoldással, de önállóan injektálja a markupot és kezeli a működést.

const __newThingsInitGuard = (function() {
  // Ha már létezik a NewThingsManager vagy az eredeti checkAndShowNewThings, ne futtassuk duplán
  if (window.NewThingsManager || window.checkAndShowNewThings) {
    return true;
  }
  return false;
})();

if (!__newThingsInitGuard) {
  (function(){
    let newThingsData = null;
    let geminiApiKeyCache = null;

    // Segédfüggvény: home.css betöltése, ha még nincs
    function ensureStylesInjected() {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const hasHomeCss = links.some(l => (l.href || '').includes('/EU2K-Hub/home.css'));
      if (!hasHomeCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/EU2K-Hub/home.css';
        document.head.appendChild(link);
      }
    }

    // Segédfüggvény: várakozás, amíg a Firestore db elérhető lesz (max 5s)
    function waitForDb(timeoutMs = 5000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          if (window.db) return resolve(window.db);
          if (Date.now() - start > timeoutMs) return reject(new Error('Firestore db not available'));
          setTimeout(tick, 100);
        };
        tick();
      });
    }

    // Popup markup injektálása (home.css osztályokkal)
    function ensurePopupInjected() {
      if (document.getElementById('newThingsPopup')) return; // már létezik

      const overlay = document.createElement('div');
      overlay.id = 'newThingsPopup';
      overlay.className = 'new-things-overlay';

      const container = document.createElement('div');
      container.className = 'new-things-container';

      const closeBtn = document.createElement('div');
      closeBtn.className = 'new-things-close-btn';
      closeBtn.innerHTML = '<img src="/EU2K-Hub/assets/close.svg" alt="Bezárás" class="new-things-icon">';
      closeBtn.addEventListener('click', closeNewThingsPopup);

      const content = document.createElement('div');
      content.className = 'new-things-content';

      const topIcon = document.createElement('img');
      topIcon.src = '/EU2K-Hub/assets/new_things.svg';
      topIcon.className = 'new-things-icon-top';
      topIcon.alt = 'Új dolgok';

      const title = document.createElement('h2');
      title.className = 'new-things-title';
      title.setAttribute('data-translate', 'pages.index.new_things_title');
      title.textContent = 'Új dolgok az EU2K Hubban';

      const subtitle = document.createElement('p');
      subtitle.id = 'newThingsSubtitle';
      subtitle.className = 'new-things-subtitle';
      subtitle.textContent = '';

      const imageContainer = document.createElement('div');
      imageContainer.className = 'new-things-image-container';
      const image = document.createElement('img');
      image.src = '/EU2K-Hub/assets/placeholder_img.svg';
      image.className = 'new-things-image';
      image.alt = 'Új dolgok';
      imageContainer.appendChild(image);

      const list = document.createElement('div');
      list.className = 'new-things-list';

      const footer = document.createElement('div');
      footer.className = 'new-things-footer';
      const link = document.createElement('a');
      link.href = 'https://eu2kdevs.hu';
      link.target = '_blank';
      link.className = 'new-things-link';
      link.setAttribute('data-translate', 'pages.index.more_info_link');
      link.innerHTML = 'Továbbiak az <b>eu2kdevs.hu</b> oldalon.';
      footer.appendChild(link);

      content.appendChild(topIcon);
      content.appendChild(title);
      content.appendChild(subtitle);
      content.appendChild(imageContainer);
      content.appendChild(list);
      content.appendChild(footer);

      container.appendChild(closeBtn);
      container.appendChild(content);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Bezárás overlay kattintásra
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeNewThingsPopup();
        }
      });
    }

    // Popup megnyitása
    function showNewThingsPopup() {
      const popup = document.getElementById('newThingsPopup');
      if (popup) {
        popup.style.display = 'flex';
      }
    }

    // Popup bezárása
    function closeNewThingsPopup() {
      const popup = document.getElementById('newThingsPopup');
      if (popup) {
        popup.style.display = 'none';
      }
    }

    // Gemini API kulcs lekérése Firebase Functions-ből (cache-elve)
    async function getGeminiApiKeyCached() {
      if (geminiApiKeyCache) return geminiApiKeyCache;
      try {
        // Ha van globális createHttpsCallable, használjuk azt
        if (typeof window.createHttpsCallable === 'function') {
          const getGeminiApiKey = window.createHttpsCallable('getGeminiApiKey');
          const apiKeyResult = await getGeminiApiKey();
          geminiApiKeyCache = apiKeyResult.data.apiKey;
          return geminiApiKeyCache;
        }
        // Ha van window.functions, dinamikusan importáljuk a httpsCallable-t
        if (window.functions) {
          const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js');
          const getGeminiApiKey = httpsCallable(window.functions, 'getGeminiApiKey');
          const apiKeyResult = await getGeminiApiKey();
          geminiApiKeyCache = apiKeyResult.data.apiKey;
          return geminiApiKeyCache;
        }
        console.warn('Firebase Functions nem elérhető – API kulcs lekérés kihagyva');
        return null;
      } catch (err) {
        console.error('Hiba a Gemini API kulcs lekérésekor:', err);
        return null;
      }
    }

    // Google GenAI példány
    async function getGoogleGenAI() {
      const apiKey = await getGeminiApiKeyCached();
      if (!apiKey) return null;
      const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
      return new GoogleGenerativeAI(apiKey);
    }

    // Fordítás segédfüggvény (először a globális translateWithAI-t próbálja, különben Gemini, végső esetben az eredeti szöveg)
    async function translateText(text, targetLang) {
      if (!text) return '';
      try {
        if (typeof window.translateWithAI === 'function') {
          return await window.translateWithAI(text, targetLang);
        }
        const ai = await getGoogleGenAI();
        if (ai) {
          const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const prompt = `Translate the following text to ${targetLang}. Respond with ONLY the translated text.\n\nText: "${text}"`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const translated = (response.text() || '').trim();
          return translated || text;
        }
      } catch (e) {
        console.warn('AI fordítás hiba, eredeti szöveg használata:', e);
      }
      return text;
    }

    // Popup tartalom frissítése
    function updatePopupContent(data) {
      if (!data) return;
      const targetLanguage = (window.translationManager && window.translationManager.currentLanguage) || 'hu';
      const translatedData = data.translations && data.translations[targetLanguage] ? data.translations[targetLanguage] : {
        state: data.state,
        new_thing1: data.new_thing1,
        new_thing2: data.new_thing2,
      };

      const subtitle = document.getElementById('newThingsSubtitle');
      if (subtitle) {
        const docName = data.document_name || data.document_id || '0.2abc';
        subtitle.textContent = `EU2K Hub ${docName} - ${translatedData.state || ''}`;
      }

      const newThingsList = document.querySelector('.new-things-list');
      if (newThingsList) {
        newThingsList.innerHTML = '';
        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.paddingLeft = '20px';
        ul.style.listStyleType = 'disc';

        if (translatedData.new_thing1) {
          const li1 = document.createElement('li');
          li1.textContent = translatedData.new_thing1;
          li1.style.color = '#C2C3C2';
          li1.style.marginBottom = '8px';
          li1.style.lineHeight = '1.5';
          ul.appendChild(li1);
        }

        if (translatedData.new_thing2) {
          const li2 = document.createElement('li');
          li2.textContent = translatedData.new_thing2;
          li2.style.color = '#C2C3C2';
          li2.style.marginBottom = '8px';
          li2.style.lineHeight = '1.5';
          ul.appendChild(li2);
        }

        newThingsList.appendChild(ul);
      }

      if (window.translationManager && typeof window.translationManager.applyTranslations === 'function') {
        window.translationManager.applyTranslations();
      }
    }

    // Firebase adatok lekérése és popup megjelenítése (ugyanaz a logika mint index.html-ben)
    async function checkAndShowNewThings() {
      try {
        await waitForDb();
        const { collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');

        const now = new Date();
        const currentTime = now.getTime();

        const updatesRef = collection(window.db, 'homePageData', 'new-things', 'updates');
        const q = query(updatesRef, orderBy('publish_date', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        let latestUpdate = null;
        let latestTimestamp = 0;
        let latestUpdateId = null;

        snapshot.forEach(doc => {
          const data = doc.data();
          const publishDate = data.publish_date;
          if (publishDate) {
            const timestamp = publishDate.toDate ? publishDate.toDate().getTime() : publishDate;
            const oneHourInMs = 60 * 60 * 1000;
            if (timestamp <= currentTime + oneHourInMs && timestamp > latestTimestamp) {
              latestTimestamp = timestamp;
              latestUpdate = { ...data, document_id: doc.id };
              latestUpdateId = doc.id;
            }
          }
        });

        if (latestUpdate) {
          const lastShownUpdateId = localStorage.getItem('lastShownNewThingsUpdateId');
          if (lastShownUpdateId !== latestUpdateId) {
            const translations = {};
            for (const lang of ['en', 'hu']) {
              translations[lang] = {
                state: await translateText(latestUpdate.state, lang),
                new_thing1: await translateText(latestUpdate.new_thing1, lang),
                new_thing2: await translateText(latestUpdate.new_thing2, lang),
              };
            }
            latestUpdate.translations = translations;
            newThingsData = latestUpdate;

            updatePopupContent(newThingsData);
            showNewThingsPopup();

            localStorage.setItem('lastShownNewThingsUpdateId', latestUpdateId);
          }
        }
      } catch (error) {
        console.error('Hiba az új dolgok lekérdezésekor:', error);
      }
    }

    // Debug / helper függvények
    function attachDebugHelpers() {
      window.resetNewThingsPopup = function () {
        console.log('🔄 Resetting new things popup tracking...');
        localStorage.removeItem('lastShownNewThingsUpdateId');
        console.log('✅ Cleared lastShownNewThingsUpdateId from localStorage');
        console.log('🔍 Checking for new updates...');
        checkAndShowNewThings().then(() => {
          console.log('✨ Check complete! If there are updates, the popup should appear.');
        }).catch(error => {
          console.error('❌ Error during check:', error);
        });
      };

      window.clearAllNewThingsData = function () {
        console.log('🗑️ Clearing all new things data...');
        const keysToRemove = ['lastShownNewThingsUpdateId', 'lastNewThingsCheck'];
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Removed ${key}`);
          }
        });
        console.log('✨ All new things data cleared!');
      };

      window.showNewThingsStatus = function () {
        console.log('📊 Current New Things Status:');
        console.log('Last shown update ID:', localStorage.getItem('lastShownNewThingsUpdateId') || 'None');
        console.log('Last check date:', localStorage.getItem('lastNewThingsCheck') || 'None');
        console.log('Current new things data:', newThingsData || 'No data loaded');
      };
    }

    // Publikus API
    window.NewThingsManager = {
      show: showNewThingsPopup,
      close: closeNewThingsPopup,
      check: checkAndShowNewThings
    };

    // Inicializálás
    window.addEventListener('DOMContentLoaded', () => {
      try {
        ensureStylesInjected();
        ensurePopupInjected();
        attachDebugHelpers();
        // Késleltetett csekkolás, hogy a Firebase betöltődjön
        setTimeout(() => {
          checkAndShowNewThings();
        }, 1000);
      } catch (e) {
        console.error('Új dolgok modul inicializációs hiba:', e);
      }
    });
  })();
}