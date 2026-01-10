
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

console.log('[StudentCalendar] Script loaded');

class StudentCalendar {
    constructor() {
        this.auth = null;
        this.db = null;
        this.container = null;
        this.classId = null;
        this.dateTextEl = null;
        this.monthTextEl = null;
        this.lessonsCache = {};
        this.teachersCache = {};
    }

    async init() {
        console.log('[StudentCalendar] Initializing...');

        let retries = 0;
        while (!window.firebaseApp && retries < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (!window.firebaseApp) {
            console.error('[StudentCalendar] Firebase app not available');
            return;
        }

        this.app = window.firebaseApp;
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);

        this.container = document.getElementById('calendar-view-timetable');
        if (!this.container) {
            console.error('[StudentCalendar] Container #calendar-view-timetable NOT found');
            return;
        }

        this.dateTextEl = document.querySelector('.calendar-date-text');
        this.monthTextEl = document.querySelector('.calendar-month-text');
        this.placesCache = {};

        this.updateDateHeader();

        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                console.log('[StudentCalendar] User logged in:', user.uid);
                this.container.innerHTML = '<div class="calendar-loading" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;"><div class="onboarding-loader"></div></div>';

                // Auto-activate the Órarend nav item
                this.activateTimetableNav();

                try {
                    await this.loadStudentData(user.uid);
                } catch (e) {
                    console.error('[StudentCalendar] Error loading data:', e);
                    this.renderError('Hiba történt az órarend betöltésekor.');
                }
            } else {
                this.renderError('Jelentkezz be az órarend megtekintéséhez.');
            }
        });

        setInterval(() => this.updateActiveStatus(), 60000);
    }

    updateDateHeader() {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        const day = now.getDate();

        const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
            'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
        const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
        const dayName = dayNames[now.getDay()];

        const dayStr = String(day).padStart(2, '0');
        if (this.dateTextEl) this.dateTextEl.textContent = `${monthNames[monthIndex]} ${dayStr}. - ${dayName}`;
        if (this.monthTextEl) this.monthTextEl.textContent = `${monthNames[monthIndex]} ${year}.`;
    }

    async loadStudentData(uid) {
        const userRef = doc(this.db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) throw new Error('User profile not found');

        const userData = userSnap.data();
        this.classId = userData.classId || userData.assignedClassId;

        if (!this.classId) {
            const ownClassRef = doc(this.db, 'users', uid, 'groups', 'ownclass');
            const ownClassSnap = await getDoc(ownClassRef);
            if (ownClassSnap.exists()) {
                const data = ownClassSnap.data();
                const classFinishes = (data.classFinishes || '').toString().trim();
                const classType = (data.classType || '').toString().trim().toLowerCase();
                if (classFinishes && classType) this.classId = `${classFinishes}${classType}`;
            }
        }

        if (!this.classId) {
            this.renderEmpty('Nincs osztályod beállítva.');
            return;
        }

        const dayName = this.getCurrentDayName();
        if (!dayName) {
            this.renderEmpty(null, 'calendar.no_lessons_weekend');
            return;
        }

        await this.fetchAndRenderTimetable(dayName);
    }

    getCurrentDayName() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const now = new Date();
        const name = days[now.getDay()];
        if (name === 'sunday' || name === 'saturday') return null;
        return name;
    }

    async fetchLessonType(lessonTypeId) {
        if (this.lessonsCache[lessonTypeId]) return this.lessonsCache[lessonTypeId];
        try {
            const snap = await getDoc(doc(this.db, 'lessons', lessonTypeId));
            if (snap.exists()) {
                this.lessonsCache[lessonTypeId] = snap.data();
                return this.lessonsCache[lessonTypeId];
            }
        } catch (e) { console.warn('[StudentCalendar] fetchLessonType error:', e); }
        return null;
    }

    async fetchTeacher(teacherId) {
        if (this.teachersCache[teacherId]) return this.teachersCache[teacherId];
        try {
            const snap = await getDoc(doc(this.db, 'teachers', teacherId));
            if (snap.exists()) {
                this.teachersCache[teacherId] = snap.data();
                return this.teachersCache[teacherId];
            }
        } catch (e) { console.warn('[StudentCalendar] fetchTeacher error:', e); }
        return null;
    }

    async fetchTeacherFullName(teacherName, teacherId) {
        if (!teacherName || !teacherId) {
            return teacherName || '-';
        }

        // Check if teacherName looks like a normalizedName (lowercase with underscores, no uppercase letters)
        const isNormalizedName = /^[a-z0-9_]+$/.test(teacherName);
        
        if (!isNormalizedName) {
            // Already looks like a full name (has uppercase letters or spaces)
            console.log(`[StudentCalendar] Teacher name already looks full: ${teacherName}`);
            return teacherName;
        }

        const cacheKey = `${teacherName}_${teacherId}`;
        if (this.teachersCache[cacheKey]) return this.teachersCache[cacheKey];
        
        try {
            // Try to lookup in usrlookup/teacher/{normalizedName}/{userId}
            const snap = await getDoc(doc(this.db, 'usrlookup', 'teacher', teacherName, teacherId));
            if (snap.exists()) {
                const data = snap.data();
                const fullName = data.fullName || teacherName;
                this.teachersCache[cacheKey] = fullName;
                console.log(`[StudentCalendar] Resolved ${teacherName} -> ${fullName}`);
                return fullName;
            } else {
                console.warn(`[StudentCalendar] No fullName found for ${teacherName}/${teacherId}`);
            }
        } catch (e) { 
            console.warn('[StudentCalendar] fetchTeacherFullName error:', e); 
        }
        
        // Cache the original name to avoid repeated lookups
        this.teachersCache[cacheKey] = teacherName;
        return teacherName; // Fallback to original name if lookup fails
    }

    async fetchPlaceName(placeid) {
        if (!placeid) return '-';
        
        if (this.placesCache[placeid]) {
            console.log(`[StudentCalendar] Place cache hit: ${placeid} -> ${this.placesCache[placeid]}`);
            return this.placesCache[placeid];
        }
        
        console.log(`[StudentCalendar] Fetching place name for: ${placeid}`);
        
        try {
            // Path: places/placeids/{placeid}/place
            // Example: places/placeids/a1/place
            const placeDocRef = doc(this.db, 'places', 'placeids', placeid, 'place');
            console.log(`[StudentCalendar] Place doc path: places/placeids/${placeid}/place`);
            
            const snap = await getDoc(placeDocRef);
            if (snap.exists()) {
                const data = snap.data();
                const placeName = data.name || placeid;
                this.placesCache[placeid] = placeName;
                console.log(`[StudentCalendar] Resolved place ${placeid} -> ${placeName}`);
                return placeName;
            } else {
                console.warn(`[StudentCalendar] Place document not found: places/placeids/${placeid}/place`);
            }
        } catch (e) { 
            console.error('[StudentCalendar] fetchPlaceName error:', e); 
        }
        
        // Cache the original placeid to avoid repeated lookups
        this.placesCache[placeid] = placeid;
        console.warn(`[StudentCalendar] Fallback: returning placeid as-is: ${placeid}`);
        return placeid; // Fallback to original placeid if lookup fails
    }

    async fetchAndRenderTimetable(day) {
        // Check if empty state is forced
        const forceEmpty = localStorage.getItem('forceEmptyState') === 'true';
        
        if (forceEmpty) {
            console.log('[StudentCalendar] Empty state FORCED by localStorage flag');
            this.renderEmpty();
            return;
        }
        
        const lessonsRef = collection(this.db, 'classes', this.classId, 'calendar', 'timetable', day);
        const snapshot = await getDocs(lessonsRef);

        if (snapshot.empty) {
            this.renderEmpty();
            return;
        }

        const lessons = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            const numMatch = docSnap.id.match(/lesson(\d+)/);
            data.number = numMatch ? parseInt(numMatch[1]) : 99;
            lessons.push(data);
        });

        lessons.sort((a, b) => a.number - b.number);
        console.log('[StudentCalendar] Lessons from Firestore:', lessons);

        // Data is now enriched by Cloud Function - no client lookups needed
        // Fields: lessonTypeName, lessonIcon, teacherName, room, timelineStart, timelineEnd

        await this.renderCards(lessons);
        this.updateActiveStatus();
    }

    async renderCards(lessons) {
        this.container.innerHTML = '';

        if (lessons.length === 0) {
            const msg = window.translationManager?.getTranslation('calendar.no_lessons_today') || 'Mára nincsenek órák.';
            this.renderEmpty(msg);
            return;
        }

        // Check if we have lesson 5 or higher (need lunch break)
        const hasLesson5OrMore = lessons.some(l => l.number >= 5);
        
        // Compact mode: 6 or more lesson cards
        const isCompact = lessons.length >= 6;

        if (isCompact) {
            this.container.classList.add('calendar-compact-mode');
        } else {
            this.container.classList.remove('calendar-compact-mode');
        }

        const col1 = document.createElement('div');
        col1.className = 'calendar-column';
        const col2 = document.createElement('div');
        col2.className = 'calendar-column';

        // Split lessons evenly: left gets more if odd number
        // E.g., 7 lessons -> 4 left, 3 right
        // E.g., 6 lessons -> 3 left, 3 right
        // E.g., 5 lessons -> 3 left, 2 right
        const totalLessons = lessons.length;
        const leftCount = Math.ceil(totalLessons / 2);
        
        const leftLessons = lessons.slice(0, leftCount);
        const rightLessons = lessons.slice(leftCount);

        // Create cards for left column
        for (const l of leftLessons) {
            const card = await this.createCard(l);
            col1.appendChild(card);
        }

        // Insert lunch BEFORE lesson 5 (first item in right column if lesson 5+ exists)
        if (hasLesson5OrMore) {
            col2.appendChild(this.createLunchCard(isCompact));
        }

        // Create cards for right column
        for (const l of rightLessons) {
            const card = await this.createCard(l);
            col2.appendChild(card);
        }

        this.container.appendChild(col1);
        this.container.appendChild(col2);
    }

    async createCard(lesson) {
        console.log('[StudentCalendar] Creating card for lesson:', lesson);
        
        const div = document.createElement('div');
        div.className = 'calendar-schedule-card';

        // Use Cloud Function resolved field names
        const name = lesson.lessonTypeName || lesson.lessonName || 'Óra';
        const teacher = lesson.teacherName || lesson.teacherFullName || '-'; // Already resolved by Cloud Function
        const room = lesson.placeName || lesson.room || '-'; // Already resolved by Cloud Function
        
        console.log('[StudentCalendar] ========== CARD DATA ==========');
        console.log('[StudentCalendar] Lesson object:', lesson);
        console.log('[StudentCalendar] Display - Name:', name);
        console.log('[StudentCalendar] Display - Teacher:', teacher);
        console.log('[StudentCalendar] Display - Place:', room);
        console.log('[StudentCalendar] Raw - teacherName:', lesson.teacherName);
        console.log('[StudentCalendar] Raw - teacherId:', lesson.teacherId);
        console.log('[StudentCalendar] Raw - teacher:', lesson.teacher);
        console.log('[StudentCalendar] Raw - placeName:', lesson.placeName);
        console.log('[StudentCalendar] Raw - placeid:', lesson.placeid);
        console.log('[StudentCalendar] ================================');
        
        const startTime = lesson.timelineStart || '';
        const endTime = lesson.timelineEnd || '';
        const iconName = lesson.lessonIcon || 'smile';
        const timeRange = (startTime && endTime) ? `${startTime} - ${endTime}` : '';

        if (startTime) div.dataset.startTime = startTime;
        if (endTime) div.dataset.endTime = endTime;
        div.dataset.icon = iconName;

        const iconPath = `assets/youhub/calendar/classes/notactive/${iconName}.svg`;

        div.innerHTML = `
      <div class="calendar-card-icon-container">
        <img src="${iconPath}" alt="" class="calendar-card-icon" data-icon="${iconName}">
      </div>
      <div class="calendar-card-middle">
        <span class="calendar-subject-name">${name}</span>
        <div class="calendar-card-details">
          <div class="calendar-detail-group-default">
            <div class="calendar-detail-item">
              <img src="assets/youhub/calendar/notactive/person.svg" alt="" class="detail-icon-teacher">
              <span>${teacher}</span>
            </div>
            <span class="calendar-detail-separator">|</span>
            <div class="calendar-detail-item">
              <img src="assets/youhub/calendar/notactive/place.svg" alt="" class="detail-icon-place">
              <span>${room}</span>
            </div>
          </div>
          <div class="calendar-detail-group-hover">
            <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock-hover">
            <span>${timeRange}</span>
          </div>
        </div>
      </div>
      <div class="calendar-card-right-bar">
        <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock">
      </div>
    `;
        
        // Add hover event listeners for fade animation
        const rightBar = div.querySelector('.calendar-card-right-bar');
        if (rightBar) {
            rightBar.addEventListener('mouseenter', () => {
                div.classList.add('hover-active');
            });
            rightBar.addEventListener('mouseleave', () => {
                div.classList.remove('hover-active');
            });
        }
        
        return div;
    }

    createLunchCard(isCompact) {
        const div = document.createElement('div');
        div.className = 'calendar-schedule-card';
        if (isCompact) div.classList.add('calendar-schedule-card--lunch-compact');

        div.dataset.startTime = "11:55";
        div.dataset.endTime = "12:25";

        if (isCompact) {
            // Single line: "Ebédszünet" on LEFT, clock icon + time on RIGHT
            div.innerHTML = `
        <div class="calendar-card-middle">
          <span class="calendar-subject-name">Ebédszünet</span>
        </div>
        <div class="calendar-lunch-right">
          <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock">
          <span class="calendar-lunch-time">11:55 - 12:25</span>
        </div>
      `;
        } else {
            // Normal lunch card - same style as others
            div.innerHTML = `
        <div class="calendar-card-middle">
          <span class="calendar-subject-name">Ebédszünet</span>
          <div class="calendar-card-details">
            <div class="calendar-detail-item">
              <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock">
              <span>11:55 - 12:25</span>
            </div>
          </div>
        </div>
      `;
        }
        return div;
    }

    updateActiveStatus() {
        if (!this.container) return;
        const cards = this.container.querySelectorAll('.calendar-schedule-card');
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        cards.forEach(card => {
            const start = card.dataset.startTime;
            const end = card.dataset.endTime;
            const iconName = card.dataset.icon || 'smile';

            if (!start || !end) {
                card.classList.remove('calendar-schedule-card--highlight');
                this.setCardIcons(card, iconName, false);
                return;
            }

            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;

            const isActive = currentMinutes >= startMin && currentMinutes <= endMin;

            if (isActive) {
                card.classList.add('calendar-schedule-card--highlight');
                this.setCardIcons(card, iconName, true);
            } else {
                card.classList.remove('calendar-schedule-card--highlight');
                this.setCardIcons(card, iconName, false);
            }
        });
    }

    setCardIcons(card, iconName, isActive) {
        const folder = isActive ? 'active' : 'notactive';

        // Main lesson icon (class icon) changes based on active state
        const mainIcon = card.querySelector('.calendar-card-icon');
        if (mainIcon && card.dataset.icon) {
            mainIcon.src = `assets/youhub/calendar/classes/${folder}/${iconName}.svg`;
        }

        card.querySelectorAll('.detail-icon-teacher').forEach(el => {
            el.src = `assets/youhub/calendar/${folder}/person.svg`;
        });
        card.querySelectorAll('.detail-icon-place').forEach(el => {
            el.src = `assets/youhub/calendar/${folder}/place.svg`;
        });
        
        // Clock icon in the right pill always stays notactive
        card.querySelectorAll('.detail-icon-clock').forEach(el => {
            el.src = `assets/youhub/calendar/notactive/clock.svg`;
        });
    }

    renderEmpty(msg, translateKey) {
        // Enhanced empty state similar to students.html - fills the grid area
        let title, titleTranslateKey, subtitle, subtitleTranslateKey;
        
        if (translateKey === 'calendar.no_lessons_weekend') {
            // Weekend or no school day
            title = window.translationManager?.getTranslation('calendar.no_lessons_today') || 'Ma nincs tanítás';
            titleTranslateKey = 'calendar.no_lessons_today';
            subtitle = window.translationManager?.getTranslation('calendar.no_lessons_weekend') || 'Jó pihenést! ☕';
            subtitleTranslateKey = 'calendar.no_lessons_weekend';
        } else if (msg) {
            // Generic message (e.g., "Mára nincsenek órák")
            title = msg;
            titleTranslateKey = 'calendar.no_lessons_today';
            subtitle = window.translationManager?.getTranslation('calendar.no_lessons_weekend') || 'Jó pihenést! ☕';
            subtitleTranslateKey = 'calendar.no_lessons_weekend';
        } else {
            // No timetable data at all
            title = window.translationManager?.getTranslation('calendar.not_found') || 'Nem találtuk az órarended!';
            titleTranslateKey = 'calendar.not_found';
            subtitle = window.translationManager?.getTranslation('calendar.not_found_desc') || 'Ha tanítási nap van, jelezd a hibát Turóczi Ádámnak vagy Hegyi Marianna titkárnőnek!';
            subtitleTranslateKey = 'calendar.not_found_desc';
        }
        
        this.container.innerHTML = `
      <div class="calendar-empty-state students-empty-state" style="display:flex;grid-column:span 2;height:100%;min-height:0;overflow:hidden;">
        <img src="assets/youhub/calendar/calendar.svg" alt="Nincsenek órák" class="students-empty-icon">
        <div class="students-empty-text-container">
          <p class="students-empty-title" data-translate="${titleTranslateKey}" data-translate-fallback="${title}">${title}</p>
          <p class="students-empty-subtitle" data-translate="${subtitleTranslateKey}" data-translate-fallback="${subtitle}">${subtitle}</p>
        </div>
      </div>
    `;
        
        // Apply translations if available
        if (window.translationManager) {
            window.translationManager.applyTranslationsToElement(this.container);
        }
    }

    renderError(msg) {
        this.container.innerHTML = `
      <div class="calendar-error-state" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;">
        <p style="color:#ff5555;text-align:center;">${msg}</p>
      </div>
    `;
    }

    activateTimetableNav() {
        // Find and click the Órarend nav item
        const timetableNavItem = document.querySelector('.calendar-nav-item[data-calendar-nav="timetable"]');
        if (timetableNavItem && !timetableNavItem.classList.contains('active')) {
            timetableNavItem.click();
            console.log('[StudentCalendar] Auto-activated Órarend nav');
        }
    }
}

const studentCalendar = new StudentCalendar();
// Export to window so date picker can access it
window.studentCalendar = studentCalendar;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => studentCalendar.init());
} else {
    studentCalendar.init();
}
