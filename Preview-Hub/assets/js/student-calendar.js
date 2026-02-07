
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
        // Skip if user has selected a custom date (handled by youhub.html date picker)
        if (window.calendarUserSelectedDate) {
            return;
        }
        
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
        console.log('[StudentCalendar] Raw - optionalLessonStudents:', lesson.optionalLessonStudents);
        console.log('[StudentCalendar] ================================');
        
        const startTime = lesson.timelineStart || '';
        const endTime = lesson.timelineEnd || '';
        const iconName = lesson.lessonIcon || 'smile';
        const timeRange = (startTime && endTime) ? `${startTime} - ${endTime}` : '';

        if (startTime) div.dataset.startTime = startTime;
        if (endTime) div.dataset.endTime = endTime;
        div.dataset.icon = iconName;

        const iconPath = `assets/youhub/calendar/classes/notactive/${iconName}.svg`;

        // Check if optional lesson - use optionalClass boolean
        const isOptionalClass = lesson.optionalClass === true;
        
        // Check if current user is in optionalLessonStudents list
        let shouldShowOptionalIndicator = false;
        if (isOptionalClass && lesson.optionalLessonStudents && typeof lesson.optionalLessonStudents === 'string' && lesson.optionalLessonStudents.trim().length > 0) {
            try {
                const currentUserId = this.auth?.currentUser?.uid;
                if (currentUserId) {
                    const normalizedNames = lesson.optionalLessonStudents.split(',').map(n => n.trim()).filter(n => n.length > 0);
                    shouldShowOptionalIndicator = await this.isUserInOptionalList(normalizedNames, currentUserId);
                    console.log('[StudentCalendar] Optional lesson check:', { isOptionalClass, normalizedNames, currentUserId, shouldShowOptionalIndicator });
                }
            } catch (error) {
                console.error('[StudentCalendar] Error checking optional lesson students:', error);
            }
        } else if (isOptionalClass) {
            // If optionalClass is true but no optionalLessonStudents, show indicator anyway
            shouldShowOptionalIndicator = true;
        }

        div.innerHTML = `
      <div class="calendar-card-icon-container">
        <img src="${iconPath}" alt="" class="calendar-card-icon" data-icon="${iconName}">
      </div>
      <div class="calendar-card-middle">
        <span class="calendar-subject-name">${name}</span>
        <div class="calendar-card-details">
          <div class="calendar-detail-group-default">
            <div class="calendar-detail-item calendar-teacher-item">
              <img src="assets/youhub/calendar/notactive/person.svg" alt="" class="detail-icon-teacher">
              <span class="calendar-teacher-text">${teacher}</span>
            </div>
            <span class="calendar-detail-separator">|</span>
            <div class="calendar-detail-item calendar-place-item">
              <img src="assets/youhub/calendar/notactive/place.svg" alt="" class="detail-icon-place">
              <span class="calendar-place-text">${room}</span>
            </div>
          </div>
          <div class="calendar-detail-group-hover">
            <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock-hover">
            <span>${timeRange}</span>
          </div>
        </div>
      </div>
      <div class="calendar-card-bars-container">
        ${shouldShowOptionalIndicator ? '<div class="calendar-card-left-bar"><span class="calendar-optional-question">?</span></div>' : ''}
        <div class="calendar-card-right-bar">
          <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock">
        </div>
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

        // Handle optional lesson hover
        if (shouldShowOptionalIndicator) {
            const leftBar = div.querySelector('.calendar-card-left-bar');
            const teacherItem = div.querySelector('.calendar-teacher-item');
            const placeItem = div.querySelector('.calendar-place-item');
            const separator = div.querySelector('.calendar-detail-separator');
            
            if (leftBar) {
                const optionalLabel = window.translationManager?.getTranslation('pages.dashboard.assign_calendars.optional_lesson_label') || 'Opcionális óra';
                
                leftBar.addEventListener('mouseenter', () => {
                    // Hide teacher and place items, show "Opcionális óra" instead
                    if (teacherItem) {
                        teacherItem.style.display = 'none';
                    }
                    if (placeItem) {
                        placeItem.style.display = 'none';
                    }
                    if (separator) {
                        separator.style.display = 'none';
                    }
                    
                    // Create and show "Opcionális óra" text
                    const optionalText = document.createElement('div');
                    optionalText.className = 'calendar-detail-item calendar-optional-text';
                    optionalText.innerHTML = `<span>${optionalLabel}</span>`;
                    optionalText.style.display = 'flex';
                    const detailGroup = div.querySelector('.calendar-detail-group-default');
                    if (detailGroup) {
                        detailGroup.appendChild(optionalText);
                    }
                });

                leftBar.addEventListener('mouseleave', () => {
                    // Restore original teacher and place items
                    if (teacherItem) {
                        teacherItem.style.display = '';
                    }
                    if (placeItem) {
                        placeItem.style.display = '';
                    }
                    if (separator) {
                        separator.style.display = '';
                    }
                    
                    // Remove optional text
                    const optionalText = div.querySelector('.calendar-optional-text');
                    if (optionalText) {
                        optionalText.remove();
                    }
                });
            }
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

    async isUserInOptionalList(normalizedNames, userId) {
        if (!normalizedNames || normalizedNames.length === 0 || !userId) return false;
        
        try {
            for (const normalizedName of normalizedNames) {
                // Try usrlookup/names/{normalizedName}/{userId}
                try {
                    const namesDocRef = doc(this.db, 'usrlookup', 'names', normalizedName, userId);
                    const namesSnap = await getDoc(namesDocRef);
                    if (namesSnap.exists()) {
                        console.log(`[StudentCalendar] Found user ${userId} in usrlookup/names/${normalizedName}`);
                        return true;
                    }
                } catch (e) {
                    // Continue to next check
                }
                
                // Try usrlookup/teachers/{normalizedName}/{userId}
                try {
                    const teachersDocRef = doc(this.db, 'usrlookup', 'teachers', normalizedName, userId);
                    const teachersSnap = await getDoc(teachersDocRef);
                    if (teachersSnap.exists()) {
                        console.log(`[StudentCalendar] Found user ${userId} in usrlookup/teachers/${normalizedName}`);
                        return true;
                    }
                } catch (e) {
                    // Continue to next normalizedName
                }
            }
            
            return false;
        } catch (error) {
            console.error('[StudentCalendar] Error checking optional list:', error);
            return false;
        }
    }

    async getCurrentUserNormalizedName() {
        if (!this.auth || !this.auth.currentUser) return null;
        
        try {
            // Use window.calendarApiCall if available (from dashboard.html), otherwise create our own wrapper
            if (window.calendarApiCall) {
                const result = await window.calendarApiCall('getCurrentUserNormalizedName');
                return result.data?.normalizedName || null;
            }
            
            // Fallback: Use Cloud Function directly with correct region
            const { httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
            const { getFunctions } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
            const functions = getFunctions(this.app, 'europe-west3'); // Use correct region
            const getCurrentUserNormalizedNameFn = httpsCallable(functions, 'calendarApi');
            
            const result = await getCurrentUserNormalizedNameFn({
                action: 'getCurrentUserNormalizedName'
            });
            
            return result.data?.normalizedName || null;
        } catch (error) {
            console.error('[StudentCalendar] Error getting normalizedName from Cloud Function:', error);
            return null;
        }
    }

    activateTimetableNav() {
        // Find and click the Órarend nav item
        const timetableNavItem = document.querySelector('.calendar-nav-item[data-calendar-nav="timetable"]');
        if (timetableNavItem && !timetableNavItem.classList.contains('active')) {
            timetableNavItem.click();
            console.log('[StudentCalendar] Auto-activated Órarend nav');
        }
    }

    // ========== EXAMS FUNCTIONALITY ==========

    async fetchAndRenderExams(day) {
        if (!this.classId) {
            console.error('[StudentCalendar] No classId for fetching exams');
            return;
        }

        const examsContainer = document.getElementById('calendar-view-exams');
        if (!examsContainer) {
            console.error('[StudentCalendar] Exams container not found');
            return;
        }

        console.log('[StudentCalendar] Fetching exams for classId:', this.classId, 'day:', day);
        console.log('[StudentCalendar] Firestore path: classes/' + this.classId + '/calendar/exams/' + day);

        examsContainer.innerHTML = '<div class="calendar-loading" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;"><div class="onboarding-loader"></div></div>';

        try {
            const examsRef = collection(this.db, 'classes', this.classId, 'calendar', 'exams', day);
            const snapshot = await getDocs(examsRef);
            console.log('[StudentCalendar] Exams snapshot empty?', snapshot.empty, 'size:', snapshot.size);

            if (snapshot.empty) {
                examsContainer.innerHTML = `
                    <div class="calendar-empty-state students-empty-state" style="display:flex;grid-column:span 2;height:100%;min-height:0;overflow:hidden;">
                        <img src="assets/youhub/calendar/calendar.svg" alt="Nincsenek dolgozatok" class="students-empty-icon">
                        <div class="students-empty-text-container">
                            <p class="students-empty-title">Nincsenek bejelentett dolgozatok</p>
                            <p class="students-empty-subtitle">Erre a napra nem jelentettek be dolgozatot.</p>
                        </div>
                    </div>
                `;
                return;
            }

            const exams = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                data.id = docSnap.id;
                exams.push(data);
            });

            // Sort by examDate
            exams.sort((a, b) => {
                const dateA = a.examDate ? new Date(a.examDate) : new Date(0);
                const dateB = b.examDate ? new Date(b.examDate) : new Date(0);
                return dateA - dateB;
            });

            console.log('[StudentCalendar] Exams from Firestore:', exams);
            await this.renderExamCards(exams, examsContainer);
        } catch (e) {
            console.error('[StudentCalendar] Error fetching exams:', e);
            examsContainer.innerHTML = `
                <div class="calendar-error-state" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;">
                    <p style="color:#ff5555;text-align:center;">Hiba történt a dolgozatok betöltésekor.</p>
                </div>
            `;
        }
    }

    getWeekRange(baseDate) {
        const d = new Date(baseDate);
        const day = d.getDay(); // Sunday=0
        const diffToMonday = (day + 6) % 7;
        const start = new Date(d);
        start.setDate(d.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    async fetchAndRenderExamsForWeek(selectedDate) {
        if (!this.classId) {
            console.error('[StudentCalendar] No classId for fetching exams');
            return;
        }

        const examsContainer = document.getElementById('calendar-view-exams');
        if (!examsContainer) {
            console.error('[StudentCalendar] Exams container not found');
            return;
        }

        const { start, end } = this.getWeekRange(selectedDate || new Date());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekDays = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            weekDays.push(dayNames[d.getDay()]);
        }

        examsContainer.innerHTML = '<div class="calendar-loading" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;"><div class="onboarding-loader"></div></div>';

        try {
            const exams = [];
            for (const day of weekDays) {
                const examsRef = collection(this.db, 'classes', this.classId, 'calendar', 'exams', day);
                const snapshot = await getDocs(examsRef);
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    data.id = docSnap.id;
                    exams.push(data);
                });
            }

            const filtered = exams.filter(exam => {
                if (!exam.examDate) return false;
                const d = exam.examDate.seconds
                    ? new Date(exam.examDate.seconds * 1000)
                    : (exam.examDate.toDate ? exam.examDate.toDate() : new Date(exam.examDate));
                if (isNaN(d.getTime())) return false;
                return d >= today && d >= start && d <= end;
            });

            filtered.sort((a, b) => {
                const dateA = a.examDate ? new Date(a.examDate.seconds ? a.examDate.seconds * 1000 : a.examDate) : new Date(0);
                const dateB = b.examDate ? new Date(b.examDate.seconds ? b.examDate.seconds * 1000 : b.examDate) : new Date(0);
                return dateA - dateB;
            });

            await this.renderExamCards(filtered, examsContainer);
        } catch (e) {
            console.error('[StudentCalendar] Error fetching exams for week:', e);
            examsContainer.innerHTML = `
                <div class="calendar-error-state" style="display:flex;justify-content:center;align-items:center;height:100%;grid-column:span 2;">
                    <p style="color:#ff5555;text-align:center;">Hiba történt a dolgozatok betöltésekor.</p>
                </div>
            `;
        }
    }

    async renderExamCards(exams, container) {
        container.innerHTML = '';

        // Get translations
        const t = (key, fallback) => window.translationManager?.getTranslation(key) || fallback;
        const noExamsTitle = t('calendar.no_exams', 'Nincsenek bejelentett dolgozatok');
        const noExamsDesc = t('calendar.no_exams_desc', 'Erre a napra nem jelentettek be dolgozatot.');
        const thatsAllTitle = t('calendar.exams_thats_all', 'Itt ennyi van');
        const thatsAllDesc = t('calendar.exams_thats_all_desc', 'Nézz vissza később ha ennyire szeretsz tanulni :)');

        if (exams.length === 0) {
            container.innerHTML = `
                <div class="calendar-empty-state students-empty-state" style="display:flex;grid-column:span 2;height:100%;min-height:0;overflow:hidden;">
                    <img src="assets/youhub/calendar/calendar.svg" alt="Nincsenek dolgozatok" class="students-empty-icon">
                    <div class="students-empty-text-container">
                        <p class="students-empty-title" data-translate="calendar.no_exams">${noExamsTitle}</p>
                        <p class="students-empty-subtitle" data-translate="calendar.no_exams_desc">${noExamsDesc}</p>
                    </div>
                </div>
            `;
            return;
        }

        // Two column layout
        const col1 = document.createElement('div');
        col1.className = 'calendar-column';
        const col2 = document.createElement('div');
        col2.className = 'calendar-column';

        // Fill: left 3, right 3, then alternate left/right
        const leftExams = [];
        const rightExams = [];
        exams.forEach((exam, index) => {
            if (index < 3) {
                leftExams.push(exam);
            } else if (index < 6) {
                rightExams.push(exam);
            } else {
                const isLeft = (index - 6) % 2 === 0;
                (isLeft ? leftExams : rightExams).push(exam);
            }
        });

        // Create cards for left column
        for (const exam of leftExams) {
            const card = this.createExamCard(exam);
            col1.appendChild(card);
        }

        // Create cards for right column
        for (const exam of rightExams) {
            const card = this.createExamCard(exam);
            col2.appendChild(card);
        }

        if (rightExams.length === 0) {
            // Add filler extension to left column (connects to right)
            const fillerExtension = document.createElement('div');
            fillerExtension.className = 'calendar-exam-filler-extension';
            col1.appendChild(fillerExtension);
        }

        const hasBalancedColumns = leftExams.length === rightExams.length && (leftExams.length === 3 || leftExams.length === 4);
        if (!hasBalancedColumns) {
            const thatsAllCard = document.createElement('div');
            const fixedHeight = rightExams.length > 0 && leftExams.length > rightExams.length;
            thatsAllCard.className = fixedHeight
                ? 'calendar-exam-thats-all-card calendar-exam-thats-all-card--fixed'
                : 'calendar-exam-thats-all-card';
            thatsAllCard.innerHTML = `
                <img src="assets/youhub/calendar/nothing_seems_to_be_here.svg" alt="" class="calendar-thats-all-icon">
                <span class="calendar-thats-all-title" data-translate="calendar.exams_thats_all">${thatsAllTitle}</span>
                <span class="calendar-thats-all-desc" data-translate="calendar.exams_thats_all_desc">${thatsAllDesc}</span>
            `;
            col2.appendChild(thatsAllCard);
        }

        container.appendChild(col1);
        container.appendChild(col2);
        
        // Apply translations
        if (window.translationManager) {
            window.translationManager.applyTranslationsToElement(container);
        }
    }

    createExamCard(exam, isHighlighted = false) {
        const div = document.createElement('div');
        div.className = 'calendar-schedule-card calendar-exam-card';
        if (isHighlighted) div.classList.add('calendar-schedule-card--highlight');

        const name = exam.lessonTypeName || exam.lessonType || 'Dolgozat';
        const lessonIconName = exam.lessonIcon || 'smile';
        
        // Format exam type for display
        const examTypeMap = {
            'temazaro': 'Témazáró',
            'ropdolgozat': 'Röpdolgozat',
            'feleles': 'Felelés',
            'prezentacio': 'Prezentáció'
        };
        const examTypeDisplay = examTypeMap[exam.examType] || exam.examType || '-';
        const examTypeIcon = exam.examType || 'temazaro';

        // Format date as YYYY.MM.DD from Firestore timestamp or ISO string
        let dateDisplay = '-';
        if (exam.examDate) {
            let date;
            // Handle Firestore timestamp
            if (exam.examDate.seconds) {
                date = new Date(exam.examDate.seconds * 1000);
            } else if (exam.examDate.toDate) {
                date = exam.examDate.toDate();
            } else {
                date = new Date(exam.examDate);
            }
            
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                dateDisplay = `${year}.${month}.${day}`;
            }
        }

        const lessonIconFolder = isHighlighted ? 'active' : 'notactive';
        const lessonIconPath = `assets/youhub/calendar/classes/${lessonIconFolder}/${lessonIconName}.svg`;
        
        const examTypeIconFolder = isHighlighted ? 'active' : 'notactive';
        const examTypeIconPath = `assets/youhub/calendar/icons/${examTypeIconFolder}/${examTypeIcon}.svg`;
        
        div.dataset.icon = lessonIconName;
        div.dataset.examType = examTypeIcon;

        div.innerHTML = `
            <div class="calendar-card-icon-container">
                <img src="${lessonIconPath}" alt="" class="calendar-card-icon" data-icon="${lessonIconName}">
            </div>
            <div class="calendar-card-middle">
                <span class="calendar-subject-name">${name}</span>
                <div class="calendar-card-details">
                    <div class="calendar-detail-group-default">
                        <div class="calendar-detail-item">
                            <img src="assets/youhub/calendar/notactive/clock.svg" alt="" class="detail-icon-clock">
                            <span>${dateDisplay}</span>
                        </div>
                        <span class="calendar-detail-separator">|</span>
                        <div class="calendar-detail-item calendar-exam-type-item">
                            <img src="${examTypeIconPath}" alt="" class="detail-icon-exam-type" data-exam-type="${examTypeIcon}">
                            <span>${examTypeDisplay}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="calendar-card-bars-container">
                <div class="calendar-card-right-bar calendar-exam-right-bar">
                    <img src="assets/youhub/calendar/exams.svg" alt="" class="detail-icon-exams">
                </div>
            </div>
        `;

        return div;
    }

    async switchToExamsView() {
        const selected = window.calendarUserSelectedDate || new Date();
        await this.fetchAndRenderExamsForWeek(selected);
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
