import { getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const ICON_BASE_PATH = "assets/system/notifs/";
const DEFAULT_ICON = `${ICON_BASE_PATH}info.svg`;
const CLOSE_ICON_PATH = `${ICON_BASE_PATH}close.svg`;
const YOUHUB_PATH = "/youhub";
const LOCAL_STORAGE_TARGET_KEY = "youhub-pending-notification";
const NOTIFS_LOCAL_STORAGE_KEY = "eu2k_notifs_settings";

const VARIANT_THEME_MAP = {
  green: {
    background: "#1B2A13",
    border: "#4B6231",
    text: "#CEFF97",
    icon: "#CEFF97",
    buttonBg: "#D3FFA1",
    buttonBorder: "#4B6231",
    buttonText: "#243114",
    buttonHoverBg: "#E5FFC8"
  },
  blue: {
    background: "#12161F",
    border: "#282F3A",
    text: "#DCEAFF",
    icon: "#68A1FF",
    buttonBg: "#84B3FF",
    buttonBorder: "#282F3A",
    buttonText: "#081730",
    buttonHoverBg: "#A3C7FF"
  },
  positive: {
    background: "#02542D",
    border: "#183908",
    text: "#EBFFEE",
    icon: "#CFF7D3",
    buttonBg: "#97FFAD",
    buttonBorder: "#CFF7D3",
    buttonText: "#042C06",
    buttonHoverBg: "#BBFFCB"
  },
  warning: {
    background: "#522504",
    border: "#211806",
    text: "#FFFBE5",
    icon: "#FFF1C2",
    buttonBg: "#FFDFAF",
    buttonBorder: "#FFF1C2",
    buttonText: "#231602",
    buttonHoverBg: "#FFE9C9"
  },
  danger: {
    background: "#690807",
    border: "#3F0F0F",
    text: "#FEE9E7",
    icon: "#FDD3D0",
    buttonBg: "#FFADB0",
    buttonBorder: "#FDD3D0",
    buttonText: "#24070F",
    buttonHoverBg: "#FFC4C7"
  }
};

const DEFAULT_NOTIF_SETTINGS = {
  sounds: true,
  "sounds-outside-school": true,
  "location-mute": false,
  "notif-sound": "notification1",
  news: true,
  events: true,
  messages: false,
  posts: false,
  invites: false,
  "new-things": true,
  "event-hub-popup": false,
  "new-things-popup": true,
  "beta-popup": true,
  "popups-popup": true,
  "push-sort": "categories",
  "popup-sort": "categories"
};

const STATE = {
  db: null,
  auth: null,
  container: null,
  unsubAuth: null,
  unsubNotifs: null,
  seenDocIds: new Set(),
  initialized: false,
  latestDoc: null,
  notifSettings: null,
  unsubNews: null,
  unsubEvents: null
};

const STYLE_ID = "youhub-notification-toaster-styles";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFirebaseApp(maxAttempts = 30, interval = 150) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return getApp();
    } catch (err) {
      await wait(interval);
    }
  }
  throw new Error("[YouHubToaster] Firebase app not initialized in time");
}

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #youhub-toast-container {
      top: 18px;
      right: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 5000;
      pointer-events: none;
    }

    .youhub-toast-container--fixed {
      position: fixed;
    }

    .youhub-toast-container--absolute {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 5000;
    }

    .youhub-toast-host {
      position: relative;
    }

    .youhub-toast {
      width: 300px;
      min-height: auto;
      border-radius: 24px;
      border: 2px solid var(--toast-border, #4B6231);
      background: var(--toast-bg, #1B2A13);
      color: var(--toast-text, #CEFF97);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
      display: flex;
      gap: 12px;
      padding: 18px 16px 12px 16px;
      transform: translateX(110%);
      opacity: 0;
      pointer-events: auto;
      transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease, margin-top 0.3s ease, margin-bottom 0.3s ease;
      margin-top: 0;
      margin-bottom: 0;
    }

    .youhub-toast.enter {
      transform: translateX(0) translateY(0);
      opacity: 1;
    }

    .youhub-toast.exit {
      transform: translateX(110%);
      opacity: 0;
    }

    .youhub-toast-icon-col {
      width: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 4px;
    }

    .youhub-toast-icon {
      width: 28px;
      height: 28px;
      background-color: var(--toast-icon, #CEFF97);
      mask: var(--toast-icon-mask) center/contain no-repeat;
      -webkit-mask: var(--toast-icon-mask) center/contain no-repeat;
    }

    .youhub-toast-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .youhub-toast-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      color: inherit;
    }

    .youhub-toast-body {
      margin: 0;
      font-size: 14px;
      color: inherit;
      opacity: 0.92;
    }

    .youhub-toast-body--collapsible {
      cursor: pointer;
    }

    .youhub-toast-button {
      align-self: flex-start;
      padding: 10px 22px;
      border-radius: 12px;
      border: 1px solid var(--toast-btn-border, #4B6231);
      background: var(--toast-btn-bg, #D3FFA1);
      color: var(--toast-btn-text, #243114);
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
      margin: 12px 0 0 0;
      margin-bottom: 0;
    }

    .youhub-toast-button:hover {
      transform: scaleY(1.05);
    }

    .youhub-toast-button:active {
      animation: toast-btn-pop 0.16s cubic-bezier(.2,0,.2,1) forwards;
    }

    @keyframes toast-btn-pop {
      0% { transform: scale(1); }
      50% { transform: scale(0.96); }
      100% { transform: scale(1); }
    }

    .youhub-toast-close-col {
      width: 68px;
      display: flex;
      justify-content: flex-end;
      margin-left: auto;
    }

    .youhub-toast-close-btn {
      width: 52px !important;
      height: 52px !important;
      border-radius: 999px !important;
      border: 1px solid var(--toast-btn-border, #4B6231) !important;
      background: var(--toast-btn-bg, #D3FFA1) !important;
      color: var(--toast-btn-text, #243114) !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: width .12s cubic-bezier(.2,0,.2,1), border-radius .12s cubic-bezier(.2,0,.2,1), background .12s ease;
    }

    .youhub-toast-close-btn:hover {
        width: 68px !important;
        border-radius: 16px !important;
        background: var(--toast-btn-bg-hover, #DEFFBA) !important;
    }

    .youhub-toast-close-btn:active {
      transform: scale(0.96);
    }

    .youhub-toast-close-icon {
      width: 14px;
      height: 14px;
      background-color: var(--toast-btn-text, #243114);
      mask: url("${CLOSE_ICON_PATH}") center/contain no-repeat;
      -webkit-mask: url("${CLOSE_ICON_PATH}") center/contain no-repeat;
    }
  `;
  document.head.appendChild(style);
}

function ensureContainer() {
  if (STATE.container) return STATE.container;
  const host = document.querySelector(".main-scroll-area");
  const container = document.createElement("div");
  container.id = "youhub-toast-container";

  if (host) {
    host.classList.add("youhub-toast-host");
    container.classList.add("youhub-toast-container--absolute");
    // Add to body for fixed positioning relative to viewport (right side of screen)
    document.body.appendChild(container);
  } else {
    container.classList.add("youhub-toast-container--fixed");
    document.body.appendChild(container);
  }

  STATE.container = container;
  return container;
}

function sanitizeIconName(raw) {
  if (!raw || typeof raw !== "string") return "info";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

function getIconPath(iconName) {
  const sanitized = sanitizeIconName(iconName);
  return `${ICON_BASE_PATH}${sanitized || "info"}.svg`;
}

function truncateContent(text) {
  if (!text) return "";
  const singleLine = text.replace(/\s+/g, " ").trim();
  const maxLength = 85;
  if (singleLine.length <= maxLength) return singleLine;
  const trimmed = singleLine.slice(0, maxLength).trimEnd();
  if (trimmed.length <= 3) return "...";
  return `${trimmed.slice(0, trimmed.length - 3)}...`;
}

function readLocalNotifSettings() {
  try {
    const raw = localStorage.getItem(NOTIFS_LOCAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTIF_SETTINGS, ...parsed };
  } catch (e) {
    console.warn("[YouHubToaster] Failed to read local notif settings:", e);
    return { ...DEFAULT_NOTIF_SETTINGS };
  }
}

function isInSchoolTime(date = new Date()) {
  const month = date.getMonth(); // 0 = Jan
  if (month === 6 || month === 7) return false; // Jul, Aug off

  const day = date.getDay(); // 0 = Sun
  if (day < 1 || day > 5) return false; // Mon–Fri only

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = 8 * 60 + 15; // 08:15
  const endMinutes = 15 * 60 + 5;   // 15:05

  return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
}

function shouldPlayNotificationSound() {
  const settings = readLocalNotifSettings();
  const locationMute = !!settings["location-mute"];
  let baseSounds = !!settings.sounds;

  if (locationMute) {
    const baseOutside = typeof settings["sounds-outside-school"] === "boolean"
      ? settings["sounds-outside-school"]
      : baseSounds;
    const inSchool = isInSchoolTime();
    return !inSchool && !!baseOutside;
  }

  return baseSounds;
}

function resolveVariant(type, priority) {
  const normalizedPriority = (priority || "").toLowerCase();
  const normalizedType = (type || "message").toLowerCase();

  if (normalizedType === "alert") {
    if (["danger", "warning", "positive"].includes(normalizedPriority)) {
      return normalizedPriority;
    }
    return "green";
  }

  if (normalizedType === "message") {
    if (normalizedPriority === "blue") return "blue";
    if (normalizedPriority === "warning") return "warning";
    if (normalizedPriority === "danger") return "danger";
    if (normalizedPriority === "positive") return "positive";
    return "green";
  }

  return "green";
}

function applyVariantColors(toastEl, variant) {
  const theme = VARIANT_THEME_MAP[variant] || VARIANT_THEME_MAP.green;
  toastEl.style.setProperty("--toast-bg", theme.background);
  toastEl.style.setProperty("--toast-border", theme.border);
  toastEl.style.setProperty("--toast-text", theme.text);
  toastEl.style.setProperty("--toast-icon", theme.icon);
  toastEl.style.setProperty("--toast-btn-bg", theme.buttonBg);
  toastEl.style.setProperty("--toast-btn-border", theme.buttonBorder);
  toastEl.style.setProperty("--toast-btn-text", theme.buttonText);
  toastEl.style.setProperty("--toast-btn-bg-hover", theme.buttonHoverBg || theme.buttonBg);
}

function openNotificationDetail(notificationId) {
  if (!notificationId) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_TARGET_KEY, notificationId);
  } catch (err) {
    console.warn("[YouHubToaster] Failed to persist target notification:", err);
  }

  const isYouhub = window.location.pathname.endsWith("youhub.html") || window.location.pathname.endsWith("/youhub");

  if (isYouhub) {
    window.dispatchEvent(new CustomEvent("youhub-open-notification", {
      detail: { id: notificationId }
    }));
  } else {
    window.location.href = YOUHUB_PATH;
  }
}

function handleDismissAction(notificationId) {
  window.dispatchEvent(new CustomEvent("youhub-toast-dismiss", {
    detail: { id: notificationId }
  }));
}

function buildActionButton(actionType, label, notificationId, closeHandler) {
  if (!notificationId) return null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "youhub-toast-button";
  button.textContent = label;
  button.addEventListener("click", () => {
    if (actionType === "dismiss") {
      handleDismissAction(notificationId);
      closeHandler();
    } else {
      openNotificationDetail(notificationId);
    }
  });
  return button;
}

function createToastElement(doc) {
  const data = doc.data() || {};
  const notificationId = doc.id;
  const getTranslation = (key, fallback) => (window.translationManager && window.translationManager.getTranslation(key)) || fallback;
  const defaultNotificationTitle = getTranslation('youhub.default_notification_title', 'Értesítés');
  const title = data.title || defaultNotificationTitle;
  const fullContent = data.content || "";
  const truncatedContent = truncateContent(fullContent);
  const isTruncated = truncatedContent !== fullContent;
  const variant = resolveVariant(data.type, data.priority);
  const iconPath = getIconPath(data.icon);
  const actionType = (data.action || "view").toLowerCase() === "dismiss" ? "dismiss" : "view";
  const actionLabel = actionType === "dismiss" ? getTranslation('youhub.notifications.actions.snooze', 'Elhalasztás') : getTranslation('youhub.notifications.actions.open', 'Megnyitás');

  const toast = document.createElement("div");
  toast.className = "youhub-toast";
  toast.setAttribute("data-variant", variant);
  toast.dataset.notificationId = notificationId;

  applyVariantColors(toast, variant);

  const iconCol = document.createElement("div");
  iconCol.className = "youhub-toast-icon-col";

  const iconEl = document.createElement("div");
  iconEl.className = "youhub-toast-icon";
  iconEl.style.setProperty("--toast-icon-mask", `url("${iconPath}")`);
  iconCol.appendChild(iconEl);

  const contentCol = document.createElement("div");
  contentCol.className = "youhub-toast-content";

  const titleEl = document.createElement("p");
  titleEl.className = "youhub-toast-title";
  titleEl.textContent = title;

  const bodyEl = document.createElement("p");
  bodyEl.className = "youhub-toast-body";
  bodyEl.textContent = truncatedContent;

  if (isTruncated) {
    bodyEl.classList.add("youhub-toast-body--collapsible", "is-collapsed");
    bodyEl.dataset.fullContent = fullContent;
    bodyEl.dataset.truncatedContent = truncatedContent;

    bodyEl.addEventListener("click", () => {
      const collapsed = bodyEl.classList.contains("is-collapsed");
      if (collapsed) {
        bodyEl.textContent = fullContent;
        bodyEl.classList.remove("is-collapsed");
        bodyEl.classList.add("is-expanded");
      } else {
        bodyEl.textContent = truncatedContent;
        bodyEl.classList.remove("is-expanded");
        bodyEl.classList.add("is-collapsed");
      }
    });
  }

  contentCol.appendChild(titleEl);
  contentCol.appendChild(bodyEl);

  const closeCol = document.createElement("div");
  closeCol.className = "youhub-toast-close-col";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "youhub-toast-close-btn";
  const closeIcon = document.createElement("div");
  closeIcon.className = "youhub-toast-close-icon";
  closeCol.appendChild(closeBtn);
  closeBtn.appendChild(closeIcon);

  toast.appendChild(iconCol);
  toast.appendChild(contentCol);
  toast.appendChild(closeCol);

  const maybeButton = buildActionButton(actionType, actionLabel, notificationId, () => closeToast(toast));
  if (maybeButton) {
    contentCol.appendChild(maybeButton);
  }

  closeBtn.addEventListener("click", () => closeToast(toast));
  return toast;
}

function closeToast(toast) {
  if (!toast || toast.classList.contains("exit")) return;
  toast.classList.remove("enter");
  toast.classList.add("exit");
  
  // Animate other toasts sliding up
  const container = toast.parentElement;
  if (container) {
    const allToasts = Array.from(container.children);
    const toastIndex = allToasts.indexOf(toast);
    
    // Animate toasts above the closing one
    for (let i = toastIndex - 1; i >= 0; i--) {
      const aboveToast = allToasts[i];
      if (aboveToast && aboveToast.classList.contains("youhub-toast")) {
        // Calculate the height of the closing toast + gap
        const toastHeight = toast.offsetHeight;
        const gap = 12; // gap between toasts
        const totalHeight = toastHeight + gap;
        
        // Animate sliding up - combine translateX and translateY
        const currentTransform = aboveToast.style.transform || '';
        const hasTranslateX = aboveToast.classList.contains("enter");
        if (hasTranslateX) {
          // Toast is in enter state, keep translateX(0) and add translateY
          aboveToast.style.transform = `translateX(0) translateY(-${totalHeight}px)`;
          setTimeout(() => {
            if (aboveToast.classList.contains("enter")) {
              aboveToast.style.transform = 'translateX(0)';
            } else {
              aboveToast.style.transform = '';
            }
          }, 300);
        } else {
          // Toast is not in enter state, just use translateY
          aboveToast.style.transform = `translateY(-${totalHeight}px)`;
          setTimeout(() => {
            aboveToast.style.transform = '';
          }, 300);
        }
      }
    }
  }
  
  setTimeout(() => {
    toast.remove();
  }, 320);
}

function playNotificationSound(priority) {
  try {
    if (!shouldPlayNotificationSound()) {
      return;
    }
    const normalizedPriority = (priority || "").toLowerCase();
    let soundFile = "notification1.wav"; // default: green, blue, positive
    
    if (normalizedPriority === "warning") {
      soundFile = "notification2.wav";
    } else if (normalizedPriority === "danger") {
      soundFile = "notification3.wav";
    }
    
    const audio = new Audio(`assets/sounds/${soundFile}`);
    audio.volume = 0.5; // 50% volume
    audio.play().catch(err => {
      console.warn("[YouHubToaster] Failed to play notification sound:", err);
    });
  } catch (error) {
    console.warn("[YouHubToaster] Error playing notification sound:", error);
  }
}

function showToast(doc) {
  const container = ensureContainer();
  const toast = createToastElement(doc);
  const data = doc.data() || {};
  const priority = data.priority || "green";
  
  // Play notification sound
  playNotificationSound(priority);
  
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("enter");
  });
  setTimeout(() => closeToast(toast), 10000);
}

function updateLatestDoc(snapshot) {
  if (!snapshot || snapshot.empty) {
    STATE.latestDoc = null;
    return;
  }
  const ordered = snapshot.docs
    .map((docSnap) => ({
      doc: docSnap,
      numericId: parseInt(docSnap.id, 10) || 0
    }))
    .sort((a, b) => b.numericId - a.numericId);
  STATE.latestDoc = ordered[0]?.doc || null;
}

function unsubscribeNotifs() {
  if (STATE.unsubNotifs) {
    STATE.unsubNotifs();
    STATE.unsubNotifs = null;
  }
}

function subscribeToUser(user) {
  unsubscribeNotifs();
  STATE.seenDocIds.clear();
  if (!user) return;

  const notifsRef = collection(STATE.db, `users/${user.uid}/notifs`);
  let initialSnapshot = true;

  STATE.unsubNotifs = onSnapshot(
    notifsRef,
    (snapshot) => {
      if (initialSnapshot) {
        snapshot.docs.forEach((doc) => STATE.seenDocIds.add(doc.id));
        updateLatestDoc(snapshot);
        initialSnapshot = false;
        return;
      }

      updateLatestDoc(snapshot);
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !STATE.seenDocIds.has(change.doc.id)) {
          STATE.seenDocIds.add(change.doc.id);
          showToast(change.doc);
        }
      });
    },
    (error) => {
      console.error("[YouHubToaster] Firestore listener error:", error);
    }
  );
}

async function initToaster() {
  if (STATE.initialized) return;
  STATE.initialized = true;

  await new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    } else {
      resolve();
    }
  });

  try {
    const app = await waitForFirebaseApp();
    STATE.db = window.db || getFirestore(app);
    STATE.auth = window.auth || getAuth(app);
  } catch (error) {
    console.error("[YouHubToaster] Failed to resolve Firebase instances:", error);
    return;
  }

  ensureStylesInjected();
  ensureContainer();

  STATE.unsubAuth = onAuthStateChanged(
    STATE.auth,
    (user) => {
      subscribeToUser(user);
      // Frissítsük a notifikációs beállításokat is (Firestoredoc vagy localStorage)
      STATE.notifSettings = readLocalNotifSettings();
    },
    (error) => {
      console.error("[YouHubToaster] Auth listener error:", error);
    }
  );
}

if (!window.__youhubNotificationToasterInitialized) {
  window.__youhubNotificationToasterInitialized = true;
  
  function arePopupsEnabled() {
    const settings = readLocalNotifSettings();
    return settings["popups-popup"] !== false;
  }

  function showPopupBlockedWarning() {
    const getTranslation = (key, fallback) =>
      (window.translationManager && window.translationManager.getTranslation(key)) || fallback;

    const title = getTranslation("popup_blocked_title", "Az ablak nem jelenhet meg");
    const body = getTranslation(
      "popup_blocked_desc",
      "A Felugró ablakokat kikapcsoltad, emiatt a popup nem tudott megnyílni.\n\nHa mégis szeretnéd, hogy a felugró ablakok megjelenjenek, kattints a Megnyitás gombra, ami a beállításokra visz téged."
    );
    const buttonLabel = getTranslation("youhub.notifications.actions.open", "Megnyitás");

    const targetUrl = "settings.html#notifications";

    window.showToastDirectly(
      title,
      body,
      "warning",
      "warning",
      buttonLabel,
      () => {
        try {
          window.location.href = targetUrl;
        } catch {
          // ignore
        }
      }
    );
  }

  // Globális helper minden popup-nyitáshoz
  window.tryOpenPopup = (openFn) => {
    try {
      if (!arePopupsEnabled()) {
        showPopupBlockedWarning();
        return false;
      }
    } catch (e) {
      console.warn("[YouHubToaster] Failed to evaluate popup settings:", e);
    }

    try {
      openFn();
    } catch (e) {
      console.error("[YouHubToaster] Popup open function threw:", e);
      return false;
    }
    return true;
  };

  // Helper function to show toast directly without Firestore - available immediately
  window.showToastDirectly = (title, content, priority = 'green', icon = 'info', buttonLabel = null, onButtonClick = null) => {
    try {
      // Wait for DOM to be ready if needed
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          window.showToastDirectly(title, content, priority, icon, buttonLabel);
        }, { once: true });
        return;
      }
      
      // Ensure styles and container are ready (works even if not fully initialized)
      ensureStylesInjected();
      const container = ensureContainer();
      
      const mockDoc = {
        id: `direct-${Date.now()}`,
        data: () => ({
          title: title,
          content: content,
          type: 'message',
          priority: priority,
          icon: icon,
          action: buttonLabel ? 'view' : 'dismiss'
        })
      };
      const toast = createToastElement(mockDoc);
      // Override button label / click handler if provided
      if (buttonLabel) {
        const oldButton = toast.querySelector('.youhub-toast-button');
        if (oldButton) {
          const button = oldButton.cloneNode(true);
          button.textContent = buttonLabel;
          oldButton.replaceWith(button);
          if (typeof onButtonClick === 'function') {
            button.addEventListener('click', () => {
              try {
                onButtonClick();
              } finally {
                closeToast(toast);
              }
            });
          }
        }
      }
      // Play notification sound
      playNotificationSound(priority);
      
      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.classList.add("enter");
      });
      setTimeout(() => closeToast(toast), 10000);
    } catch (error) {
      console.error('[YouHubToaster] Failed to show toast directly:', error);
      // Fallback to alert if toast fails
      alert(`${title}: ${content}`);
    }
  };
  
  initToaster().catch((err) => {
    console.error("[YouHubToaster] Initialization failed:", err);
  });

  window.sendLatestYouhubNotification = () => {
    if (STATE.latestDoc) {
      showToast(STATE.latestDoc);
    } else {
      console.warn("[YouHubToaster] No notifications available to simulate.");
    }
  };

  // Console commands for testing notifications
  // NOTE: These functions ONLY display notifications directly, they do NOT write to Firestore
  window.testNotification = (priority = 'warning', buttonLabel = null) => {
    const getTranslation = (key, fallback) => (window.translationManager && window.translationManager.getTranslation(key)) || fallback;
    if (!buttonLabel) {
      buttonLabel = getTranslation('youhub.notifications.actions.open', 'Megnyitás');
    }
    const priorities = ['green', 'blue', 'positive', 'warning', 'danger'];
    const selectedPriority = priorities.includes(priority) ? priority : 'warning';
    const titles = {
      green: getTranslation('youhub.notifications.types.info', 'Információ'),
      blue: getTranslation('youhub.notifications.types.info', 'Információ'),
      positive: getTranslation('youhub.notifications.types.success', 'Sikeres művelet'),
      warning: getTranslation('youhub.notifications.types.warning', 'Figyelmeztetés'),
      danger: getTranslation('youhub.notifications.types.error', 'Hiba')
    };
    const contents = {
      green: getTranslation('youhub.notifications.messages.info', 'Ez egy információs értesítés.'),
      blue: getTranslation('youhub.notifications.messages.info_blue', 'Ez egy kék információs értesítés.'),
      positive: getTranslation('youhub.notifications.messages.success', 'A művelet sikeresen befejeződött!'),
      warning: getTranslation('youhub.notifications.messages.warning', 'Kérlek töltsd ki a kötelező mezőket.'),
      danger: getTranslation('youhub.notifications.messages.error', 'Hiba történt a művelet során!')
    };
    const defaultNotificationTitle = getTranslation('youhub.default_notification_title', 'Értesítés');
    const testMessage = getTranslation('youhub.notifications.messages.test', 'Ez egy teszt értesítés.');
    const testShown = getTranslation('youhub.notifications.messages.test_shown', 'Teszt értesítés megjelenítve');
    // Use showToastDirectly - this does NOT write to Firestore, only displays the notification
    window.showToastDirectly(
      titles[selectedPriority] || defaultNotificationTitle,
      contents[selectedPriority] || testMessage,
      selectedPriority,
      'info',
      buttonLabel
    );
    console.log(`✅ ${testShown}: ${selectedPriority} priority, gomb: "${buttonLabel}"`);
  };

  // Helper to show all notification types
  // NOTE: This function ONLY displays notifications directly, it does NOT write to Firestore
  window.testAllNotifications = () => {
    const getTranslation = (key, fallback) => (window.translationManager && window.translationManager.getTranslation(key)) || fallback;
    const testingAll = getTranslation('youhub.notifications.messages.testing_all', 'Összes értesítés típus tesztelése...');
    console.log(`🧪 ${testingAll}`);
    const openLabel = getTranslation('youhub.notifications.actions.open', 'Megnyitás');
    const priorities = ['green', 'blue', 'positive', 'warning', 'danger'];
    priorities.forEach((priority, index) => {
      setTimeout(() => {
        window.testNotification(priority, openLabel);
      }, index * 2000);
    });
  };

  console.log('📢 Konzol parancsok elérhetők:');
  console.log('  testNotification(priority, buttonLabel) - Teszt értesítés megjelenítése');
  console.log('    priority: "green", "blue", "positive", "warning", "danger"');
  console.log('    buttonLabel: A gomb szövege (pl. "Megnyitás", "Bezárás")');
  console.log('  Példa: testNotification("warning", "Rendben")');
  console.log('  testAllNotifications() - Összes típus tesztelése');
}

