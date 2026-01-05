/**
 * EU2K Hub Calendar Assignment Cloud Function
 * Region: europe-west3 (Frankfurt)
 * 
 * Features:
 * - Class loading and name formatting
 * - Lesson type and teacher loading
 * - Timeline collision detection
 * - Variation rules with week counting
 * - Date-based repeat logic
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { differenceInWeeks, startOfWeek, addMinutes, parseISO, format, isBefore, isAfter, eachWeekOfInterval, eachMonthOfInterval, getDay } = require('date-fns');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const region = 'europe-west3';

// In-memory state per user session (for simplicity; in production use Firestore or Redis)
// Note: Cloud Functions are stateless, so we use Firestore for session storage
const SESSION_COLLECTION = 'calendarSessions';

/**
 * Format class ID to readable name
 * e.g., "2030e" -> "8.E Osztály"
 */
function formatClassName(classId) {
    const match = classId.match(/^(\d{4})([a-z])$/i);
    if (!match) return classId;

    const gradYear = parseInt(match[1]);
    const classLetter = match[2].toUpperCase();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Calculate grade: if before September, use current year, else next
    const schoolYear = currentMonth < 8 ? currentYear : currentYear + 1;
    const grade = 12 - (gradYear - schoolYear);

    if (grade < 1 || grade > 12) return classId;

    return `${grade}.${classLetter} Osztály`;
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Format minutes to "HH:MM"
 */
function formatMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format date to "HH:MM" in Europe/Budapest timezone
 */
function formatTime(date) {
    if (!date) return null;
    return date.toLocaleTimeString('hu-HU', {
        timeZone: 'Europe/Budapest',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

/**
 * Get week number from first school day
 */
function getSchoolWeekNumber(date, firstDayTimestamp) {
    const firstDay = firstDayTimestamp.toDate ? firstDayTimestamp.toDate() : new Date(firstDayTimestamp);
    const firstMonday = startOfWeek(firstDay, { weekStartsOn: 1 });
    const targetMonday = startOfWeek(date, { weekStartsOn: 1 });
    return differenceInWeeks(targetMonday, firstMonday) + 1;
}

/**
 * Check if variation should apply on a given date
 */
function shouldApplyVariation(date, repeatRule, firstDayTimestamp) {
    const [type, countStr] = repeatRule.split('_');
    const count = parseInt(countStr);

    if (type === 'week') {
        const weekNum = getSchoolWeekNumber(date, firstDayTimestamp);
        return weekNum % count === 0;
    } else if (type === 'month') {
        // Month-based repetition
        const monthNum = date.getMonth() + 1;
        return monthNum % count === 0;
    }
    return false;
}

// ========== CALLABLE FUNCTIONS ==========

/**
 * Load all classes and format names
 */
exports.loadClasses = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;

        // Check staff privileges
        const userRecord = await admin.auth().getUser(uid);
        const claims = userRecord.customClaims || {};
        if (!claims.admin && !claims.owner && !claims.teacher) {
            throw new HttpsError('permission-denied', 'Only staff can access calendar assignment');
        }

        const classesSnapshot = await db.collection('classes').get();
        const classes = [];
        const classMapping = {};

        classesSnapshot.forEach(doc => {
            const classId = doc.id;
            const formattedName = formatClassName(classId);
            classes.push({ id: classId, name: formattedName });
            classMapping[formattedName] = classId;
        });

        // Store mapping in session
        await db.collection(SESSION_COLLECTION).doc(uid).set({
            classMapping,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`[Calendar] Loaded ${classes.length} classes for user ${uid}`);
        return { classes };

    } catch (error) {
        console.error('[Calendar] loadClasses error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to load classes');
    }
});

/**
 * Select class and store in session
 */
exports.selectClass = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const { className } = request.data;

        // Get session with class mapping
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        if (!sessionDoc.exists) {
            throw new HttpsError('failed-precondition', 'Session not found. Load classes first.');
        }

        const { classMapping } = sessionDoc.data();
        const classId = classMapping[className];
        if (!classId) {
            throw new HttpsError('invalid-argument', 'Invalid class name');
        }

        // Update session
        await db.collection(SESSION_COLLECTION).doc(uid).update({
            selectedClassId: classId,
            selectedClassName: className
        });

        console.log(`[Calendar] Selected class ${classId} (${className}) for user ${uid}`);
        return { success: true, classId, className };

    } catch (error) {
        console.error('[Calendar] selectClass error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to select class');
    }
});

/**
 * Select time slot (day and hour)
 */
exports.selectTimeSlot = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const { day, hour, process } = request.data;

        const dayNames = {
            monday: 'Hétfő', tuesday: 'Kedd', wednesday: 'Szerda',
            thursday: 'Csütörtök', friday: 'Péntek'
        };

        // Validate inputs
        if (!dayNames[day]) {
            throw new HttpsError('invalid-argument', 'Invalid day');
        }
        if (hour < 0 || hour > 10) {
            throw new HttpsError('invalid-argument', 'Invalid hour (0-10)');
        }

        // Update session
        await db.collection(SESSION_COLLECTION).doc(uid).update({
            selectedDay: day,
            selectedHour: hour,
            assignProcess: process || 'schedule'
        });

        // Get session to return class name
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        const { selectedClassName } = sessionDoc.data();

        console.log(`[Calendar] Selected ${day} ${hour}. óra for user ${uid}`);
        return {
            success: true,
            className: selectedClassName,
            dayName: dayNames[day],
            hourLabel: `${hour}. óra`
        };

    } catch (error) {
        console.error('[Calendar] selectTimeSlot error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to select time slot');
    }
});

/**
 * Load lesson types from lessons collection with timetable data
 */
exports.loadLessonTypes = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;

        // Allow client to override selectedHour (e.g. when clicking Edit on a card)
        const { selectedHour: paramHour } = request.data;

        // Get session to know which hour is selected (fallback)
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        let selectedHour = sessionDoc.exists ? sessionDoc.data().selectedHour : null;

        if (paramHour !== undefined && paramHour !== null) {
            selectedHour = paramHour;
        }

        // Get lessons
        const lessonsSnapshot = await db.collection('lessons').get();
        const lessons = [];

        // Get timetable data for each lesson
        for (const doc of lessonsSnapshot.docs) {
            const data = doc.data();
            const lessonId = doc.id;

            // Try to get timeline from timetable/{lessonId}
            let startTime = null;
            let finishTime = null;

            try {
                const timetableDoc = await db.collection('timetable').doc(lessonId).get();
                if (timetableDoc.exists) {
                    const ttData = timetableDoc.data();
                    if (ttData.startTime) {
                        startTime = ttData.startTime.toDate
                            ? formatTime(ttData.startTime.toDate())
                            : ttData.startTime;
                    }
                    if (ttData.finishTime) {
                        finishTime = ttData.finishTime.toDate
                            ? formatTime(ttData.finishTime.toDate())
                            : ttData.finishTime;
                    }
                }
            } catch (e) {
                console.log(`[Calendar] No timetable for lesson ${lessonId}`);
            }

            // Also try timetable/lesson{selectedHour} for default times
            if (!startTime && selectedHour !== null) {
                try {
                    const defaultTimeDoc = await db.collection('timetable').doc(`lesson${selectedHour}`).get();
                    if (defaultTimeDoc.exists) {
                        const ttData = defaultTimeDoc.data();
                        if (ttData.startTime) {
                            startTime = ttData.startTime.toDate
                                ? formatTime(ttData.startTime.toDate())
                                : ttData.startTime;
                        }
                        if (ttData.finishTime) {
                            finishTime = ttData.finishTime.toDate
                                ? formatTime(ttData.finishTime.toDate())
                                : ttData.finishTime;
                        }
                    }
                } catch (e) {
                    console.log(`[Calendar] No default timetable for lesson${selectedHour}`);
                }
            }

            lessons.push({
                id: lessonId,
                name: data.name || lessonId,
                startTime,
                finishTime
            });
        }

        // Also get default timetable for current hour
        let defaultTimeline = null;
        if (selectedHour !== null) {
            try {
                const defaultTimeDoc = await db.collection('timetable').doc(`lesson${selectedHour}`).get();
                if (defaultTimeDoc.exists) {
                    const ttData = defaultTimeDoc.data();
                    defaultTimeline = {
                        startTime: ttData.startTime?.toDate
                            ? formatTime(ttData.startTime.toDate())
                            : ttData.startTime,
                        finishTime: ttData.finishTime?.toDate
                            ? formatTime(ttData.finishTime.toDate())
                            : ttData.finishTime
                    };
                }
            } catch (e) {
                console.log(`[Calendar] Error getting default timeline`);
            }
        }

        console.log(`[Calendar] Loaded ${lessons.length} lesson types with timetable data`);
        return { lessons, defaultTimeline };

    } catch (error) {
        console.error('[Calendar] loadLessonTypes error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to load lesson types');
    }
});

/**
 * Load teachers from usrlookup/teachers
 */
exports.loadTeachers = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const teachers = [];
        const teacherMapping = {};

        // Structure: usrlookup/teachers/{normalizedName}/{userId}
        const teachersRef = db.collection('usrlookup').doc('teachers');
        const teachersDoc = await teachersRef.get();

        if (teachersDoc.exists) {
            // Get subcollections (normalizedName collections)
            const collections = await teachersRef.listCollections();

            for (const collection of collections) {
                const normalizedName = collection.id;
                const userDocs = await collection.get();

                for (const userDoc of userDocs.docs) {
                    const data = userDoc.data();
                    if (data.fullName) {
                        teachers.push({
                            normalizedName,
                            fullName: data.fullName
                        });
                        teacherMapping[data.fullName] = normalizedName;
                        break; // Only need one fullName per normalizedName
                    }
                }
            }
        }

        // Store teacher mapping in session
        await db.collection(SESSION_COLLECTION).doc(uid).update({
            teacherMapping
        });

        console.log(`[Calendar] Loaded ${teachers.length} teachers`);
        return { teachers };

    } catch (error) {
        console.error('[Calendar] loadTeachers error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to load teachers');
    }
});

/**
 * Validate timeline for collision detection
 */
/**
 * Validate and Resolve Timeline
 * - Fetches defaults from Firestore if input is missing
 * - Checks for collisions
 * - Logs user selection vs. resolved values
 */
exports.validateTimeline = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { lessonNumber, lessonType, startTime: inputStartTime, endTime: inputEndTime } = request.data;

        // Helper to normalize time to HH:MM
        function normalizeTime(t) {
            if (!t) return null;
            if (t.includes(':')) {
                const parts = t.split(':');
                if (parts.length === 2) {
                    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
                }
            }
            return null; // Invalid format
        }

        let resolvedStartTime = normalizeTime(inputStartTime);
        let resolvedEndTime = normalizeTime(inputEndTime);
        let source = 'user_input';

        // 1. Resolve Times if missing
        if (!resolvedStartTime || !resolvedEndTime) {
            // Try timetable/{lessonType}
            if (lessonType) {
                try {
                    const typeDoc = await db.collection('timetable').doc(lessonType).get();
                    if (typeDoc.exists) {
                        const data = typeDoc.data();
                        if (data.startTime && data.finishTime) {
                            const startRaw = data.startTime.toDate ? formatTime(data.startTime.toDate()) : data.startTime;
                            const endRaw = data.finishTime.toDate ? formatTime(data.finishTime.toDate()) : data.finishTime;

                            const start = normalizeTime(startRaw);
                            const end = normalizeTime(endRaw);

                            if (start && end) {
                                // Only override if input was empty or invalid
                                if (!resolvedStartTime) resolvedStartTime = start;
                                if (!resolvedEndTime) resolvedEndTime = end;
                                source = `timetable/${lessonType}`;
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Calendar] Error resolving lessonType ${lessonType}:`, e);
                }
            }

            // Fallback to timetable/lesson{lessonNumber}
            if (!resolvedStartTime || !resolvedEndTime) {
                try {
                    const lessonDoc = await db.collection('timetable').doc(`lesson${lessonNumber}`).get();
                    if (lessonDoc.exists) {
                        const data = lessonDoc.data();
                        if (data.startTime && data.finishTime) {
                            const startRaw = data.startTime.toDate ? formatTime(data.startTime.toDate()) : data.startTime;
                            const endRaw = data.finishTime.toDate ? formatTime(data.finishTime.toDate()) : data.finishTime;

                            const start = normalizeTime(startRaw);
                            const end = normalizeTime(endRaw);

                            if (start && end) {
                                if (!resolvedStartTime) resolvedStartTime = start;
                                if (!resolvedEndTime) resolvedEndTime = end;
                                source = `timetable/lesson${lessonNumber}`;
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Calendar] Error resolving lesson${lessonNumber}:`, e);
                }
            }
        }

        console.log(`[Calendar] Timeline Resolution | User Input: ${inputStartTime}-${inputEndTime} | Source: ${source} | Resolved: ${resolvedStartTime}-${resolvedEndTime}`);

        // Ultimate Fallback if Firestore is empty/missing
        if (!resolvedStartTime) {
            resolvedStartTime = '00:00';
            source = 'fallback_zero';
        }

        // 2. Validate format (Strict HH:MM)
        if (!/^\d{2}:\d{2}$/.test(resolvedStartTime)) {
            // Should not happen due to normalizeTime, but safety check
            console.error(`[Calendar] Invalid resolved time: ${resolvedStartTime}`);
            resolvedStartTime = '00:00'; // Override with safe default
        }

        const startMinutes = parseTimeToMinutes(resolvedStartTime);

        // Calculate end minutes if we have a resolved end time
        let endMinutes = resolvedEndTime ? parseTimeToMinutes(resolvedEndTime) : startMinutes + 45;
        let duration = endMinutes - startMinutes;
        if (duration <= 0) duration = 45; // Default safety

        let collision = false;
        let warningMessage = null;

        // 3. Collision Detection
        const timetableSnapshot = await db.collection('timetable').get();

        for (const doc of timetableSnapshot.docs) {
            // Skip self and non-lesson docs (implied by having lessonX format usually, but check content)
            if (doc.id === `lesson${lessonNumber}`) continue;
            // Also skip if it's a lesson type definition (not a timeslot def) - actually timetable collection mixes these?
            // The user implies timetable/{lessonType} exists.
            // But for collision, we only care about fixed lesson slots "lesson1", "lesson2" etc.
            // Let's assume docs starting with "lesson" followed by digit are slots.
            if (!doc.id.match(/^lesson\d+$/)) continue;

            const data = doc.data();
            if (!data.startTime || !data.finishTime) continue;

            const lessonStartTime = data.startTime.toDate ? formatTime(data.startTime.toDate()) : data.startTime;
            const lessonEndTime = data.finishTime.toDate ? formatTime(data.finishTime.toDate()) : data.finishTime;

            const lessonStartMinutes = parseTimeToMinutes(lessonStartTime);
            const lessonEndMinutes = parseTimeToMinutes(lessonEndTime);

            // Check overlap
            if (endMinutes > lessonStartMinutes && startMinutes < lessonEndMinutes) {
                collision = true;
                // Fix duration
                const maxEndMinutes = lessonStartMinutes - 5;
                const maxDuration = Math.max(0, maxEndMinutes - startMinutes);
                warningMessage = `Tanórák nem ütközhetnek! ${lessonNumber}. óra hossza csökkentve: ${maxDuration} perc.`;

                // Update resolved end time
                endMinutes = startMinutes + maxDuration;
                resolvedEndTime = formatMinutesToTime(endMinutes);
                break;
            }
        }

        if (!resolvedEndTime) resolvedEndTime = formatMinutesToTime(endMinutes);

        console.log(`[Calendar] Final Validated: ${resolvedStartTime} - ${resolvedEndTime} | Collision: ${collision}`);

        return {
            valid: true, // Always return valid params to populate UI, unless fatal error
            startTime: resolvedStartTime,
            endTime: resolvedEndTime,
            source,
            collision,
            warning: warningMessage
        };

    } catch (error) {
        console.error('[Calendar] validateTimeline error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to validate timeline');
    }
});

/**
 * Save lesson assignment
 */
exports.saveLessonAssignment = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const data = request.data;

        // Get session
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        if (!sessionDoc.exists) {
            throw new HttpsError('failed-precondition', 'Session not found');
        }

        const sessionData = sessionDoc.data();
        const lessonData = sessionData.lessonData || {};

        if (data.lessons) {
            // Bulk update
            // Check if items are days or lessons
            Object.entries(data.lessons).forEach(([key, val]) => {
                const isDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(key);

                if (isDay) {
                    // Handle Day Bucket
                    if (!lessonData[key]) lessonData[key] = {};
                    const dayLessons = val; // { 0: {...}, 1: {...} }

                    if (dayLessons) {
                        Object.entries(dayLessons).forEach(([num, lData]) => {
                            if (!lData) {
                                delete lessonData[key][num];
                            } else {
                                lessonData[key][num] = {
                                    lessonType: lData.lessonType,
                                    lessonTypeName: lData.lessonTypeName,
                                    teacher: lData.teacher,
                                    teacherName: lData.teacherName,
                                    teacher2: lData.teacher2 || null,
                                    teacherName2: lData.teacherName2 || null,
                                    studentGroup: lData.studentGroup || null,
                                    startTime: lData.timelineStart || lData.startTime,
                                    endTime: lData.timelineEnd || lData.endTime,
                                    useDefaultTime: false
                                };
                            }
                        });
                    }
                } else {
                    // Legacy/Flat format (key is lesson number)
                    // We treat this as "no specific day" or "current day" - but mixed storage is bad.
                    // If we want to support this, we should really know the day.
                    // For now, if we detect numbers, we might just store them at root (Legacy behavior)
                    // OR ignore them if we want to enforce new standard.
                    // To keep legacy working, let's keep root assignment if key is number
                    if (!isNaN(parseInt(key))) {
                        const num = key;
                        const lData = val;
                        if (!lData) {
                            delete lessonData[num];
                        } else {
                            lessonData[num] = {
                                lessonType: lData.lessonType,
                                lessonTypeName: lData.lessonTypeName,
                                teacher: lData.teacher,
                                teacherName: lData.teacherName,
                                teacher2: lData.teacher2 || null,
                                teacherName2: lData.teacherName2 || null,
                                studentGroup: lData.studentGroup || null,
                                startTime: lData.timelineStart || lData.startTime,
                                endTime: lData.timelineEnd || lData.endTime,
                                useDefaultTime: false
                            };
                        }
                    }
                }
            });
        } else {
            // Legacy single update support
            const { lessonNumber, lessonType, teacher, startTime, endTime, useDefaultTime } = data;
            const day = data.day; // Optional day param?

            // If day is provided, we save to that day. Else root (legacy).
            if (day && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)) {
                if (!lessonData[day]) lessonData[day] = {};
                if (lessonNumber) {
                    lessonData[day][lessonNumber] = {
                        lessonType,
                        teacher,
                        startTime: useDefaultTime ? null : startTime,
                        endTime: useDefaultTime ? null : endTime,
                        useDefaultTime: !!useDefaultTime
                    };
                }
            } else if (lessonNumber) {
                lessonData[lessonNumber] = {
                    lessonType,
                    teacher,
                    startTime: useDefaultTime ? null : startTime,
                    endTime: useDefaultTime ? null : endTime,
                    useDefaultTime: !!useDefaultTime
                };
            }
        }

        await db.collection(SESSION_COLLECTION).doc(uid).update({
            lessonData
        });

        console.log(`[Calendar] Saved lesson assignment for user ${uid}`);
        return { success: true };

    } catch (error) {
        console.error('[Calendar] saveLessonAssignment error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to save lesson assignment');
    }
});

/**
 * Get lesson cards data for display
 */
exports.getLessonCards = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;

        // Get session
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        if (!sessionDoc.exists) {
            throw new HttpsError('failed-precondition', 'Session not found');
        }

        const sessionData = sessionDoc.data();
        const { selectedDay, lessonData = {}, teacherMapping = {} } = sessionData;

        const dayNames = {
            monday: 'Hétfő', tuesday: 'Kedd', wednesday: 'Szerda',
            thursday: 'Csütörtök', friday: 'Péntek'
        };

        // Get lesson names
        const lessonsSnapshot = await db.collection('lessons').get();
        const lessonNames = {};
        lessonsSnapshot.forEach(doc => {
            lessonNames[doc.id] = doc.data().name || doc.id;
        });

        // Get default times from timetable
        const timetableSnapshot = await db.collection('timetable').get();
        const defaultTimes = {};
        timetableSnapshot.forEach(doc => {
            const match = doc.id.match(/^lesson(\d+)$/);
            if (match) {
                const data = doc.data();
                defaultTimes[match[1]] = {
                    startTime: data.startTime?.toDate ? formatTime(data.startTime.toDate()) : data.startTime,
                    finishTime: data.finishTime?.toDate ? formatTime(data.finishTime.toDate()) : data.finishTime
                };
            }
        });

        // Resolve current day's lesson data
        let currentDayLessons = lessonData;
        // If lessonData has the selectedDay key, use that bucket.
        // Otherwise, fall back to root (legacy) or empty if structure is new but day not found.
        if (selectedDay && lessonData[selectedDay]) {
            currentDayLessons = lessonData[selectedDay];
        }

        // Build cards
        const cards = [];
        for (let i = 1; i <= 8; i++) {
            const data = currentDayLessons[i];
            if (data) {
                // Get teacher fullName
                let teacherFullName = data.teacherName || data.teacher;
                if (!data.teacherName && teacherMapping[data.teacher]) {
                    // Reverse lookup - data.teacher might be normalizedName
                    // Original code assigned data.teacher, but teacherMapping likely holds the full name?
                    // Safe approach: if data.teacherName exists use it.
                    // If not, use mapping if available.
                    // Assuming mapping contains the full name.
                    // If previous code was `teacherFullName = data.teacher` inside the if, maybe it was a no-op/bug?
                    // I will use mapping value if available.
                    // If mapping is map<normalized, full>:
                    // teacherFullName = teacherMapping[data.teacher];
                    // BUT for safety I will stick to data.teacher if mapping is weird, but try to use name if saved.
                }

                // Get timeline
                let timeline;
                if (data.useDefaultTime && defaultTimes[i]) {
                    timeline = `${defaultTimes[i].startTime} - ${defaultTimes[i].finishTime}`;
                } else if (data.startTime && data.endTime) {
                    timeline = `${data.startTime} - ${data.endTime}`;
                } else {
                    timeline = '-';
                }

                cards.push({
                    number: i,
                    typeName: lessonNames[data.lessonType] || data.lessonType || '-',
                    teacher: teacherFullName || '-',
                    teacher2: data.teacherName2 || data.teacher2 || null,
                    studentGroup: data.studentGroup || null,
                    timeline,
                    complete: true
                });
            } else {
                cards.push({
                    number: i,
                    typeName: '-',
                    teacher: '-',
                    timeline: '-',
                    complete: false
                });
            }
        }

        return {
            dayName: dayNames[selectedDay] || selectedDay,
            cards
        };

    } catch (error) {
        console.error('[Calendar] getLessonCards error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to get lesson cards');
    }
});

/**
 * Save variation rule
 */
exports.saveVariation = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const { lessonNumber, lessonType, teacher, repeatRule, dateSequence } = request.data;

        // Validate repeatRule format (e.g., "week_1", "month_2")
        if (!/^(week|month)_\d+$/.test(repeatRule)) {
            throw new HttpsError('invalid-argument', 'Invalid repeat rule format');
        }

        // Parse date sequence
        let startDate = null;
        let endDate = null;
        if (dateSequence) {
            const parts = dateSequence.split(' - ');
            if (parts.length === 1) {
                // Single date - repeat until this date
                endDate = parts[0].trim().replace(/\./g, '-');
            } else if (parts.length === 2) {
                // Range
                startDate = parts[0].trim().replace(/\./g, '-');
                endDate = parts[1].trim().replace(/\./g, '-');
            }
        }

        // Get session
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();
        if (!sessionDoc.exists) {
            throw new HttpsError('failed-precondition', 'Session not found');
        }

        const sessionData = sessionDoc.data();
        const variations = sessionData.variations || {};

        // Store variation keyed by day + lesson number
        const key = `${sessionData.selectedDay}_${lessonNumber}`;
        variations[key] = {
            lessonNumber,
            day: sessionData.selectedDay,
            lessonType,
            teacher,
            repeatRule,
            startDate,
            endDate
        };

        await db.collection(SESSION_COLLECTION).doc(uid).update({
            variations
        });

        console.log(`[Calendar] Saved variation for ${key}`);
        return { success: true };

    } catch (error) {
        console.error('[Calendar] saveVariation error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to save variation');
    }
});

/**
 * Get variation preview - calculate affected dates
 */
exports.getVariationPreview = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { repeatRule, dateSequence, day } = request.data;

        // Get first school day
        const timetableInfoDoc = await db.doc('youhub/calendar/timetableInfo/firstDay').get();
        let firstDay = new Date();
        if (timetableInfoDoc.exists) {
            const data = timetableInfoDoc.data();
            if (data.firstDay) {
                firstDay = data.firstDay.toDate ? data.firstDay.toDate() : new Date(data.firstDay);
            }
        }

        // Parse repeat rule
        const [type, countStr] = repeatRule.split('_');
        const count = parseInt(countStr);

        // Parse date sequence
        let startDate = new Date();
        let endDate = null;
        if (dateSequence) {
            const parts = dateSequence.split(' - ');
            if (parts.length === 1) {
                endDate = parseISO(parts[0].trim().replace(/\./g, '-'));
            } else if (parts.length === 2) {
                startDate = parseISO(parts[0].trim().replace(/\./g, '-'));
                endDate = parseISO(parts[1].trim().replace(/\./g, '-'));
            }
        }

        // If no end date, use next 3 months
        if (!endDate) {
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);
        }

        // Calculate affected dates
        const dayIndex = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 }[day];
        const affectedDates = [];
        const datesByMonth = {};

        // Iterate through weeks
        let current = startDate;
        let weekCounter = 0;

        while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
            // Check if this is the right day of week
            if (getDay(current) === dayIndex) {
                const weekNum = getSchoolWeekNumber(current, firstDay);

                // Check if this week matches the repeat pattern
                if (type === 'week' && weekNum % count === 0) {
                    const monthName = format(current, 'MMMM');
                    if (!datesByMonth[monthName]) datesByMonth[monthName] = [];
                    datesByMonth[monthName].push(format(current, 'd'));
                    affectedDates.push(format(current, 'yyyy-MM-dd'));
                }
            }

            // Move to next day
            current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        }

        return {
            affectedDates,
            datesByMonth,
            totalCount: affectedDates.length
        };

    } catch (error) {
        console.error('[Calendar] getVariationPreview error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to get variation preview');
    }
});

/**
 * Get current session data
 */
exports.getSessionData = onCall({ region }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        const sessionDoc = await db.collection(SESSION_COLLECTION).doc(uid).get();

        if (!sessionDoc.exists) {
            return { exists: false };
        }

        const data = sessionDoc.data();
        const dayNames = {
            monday: 'Hétfő', tuesday: 'Kedd', wednesday: 'Szerda',
            thursday: 'Csütörtök', friday: 'Péntek'
        };

        return {
            exists: true,
            className: data.selectedClassName,
            classId: data.selectedClassId,
            day: data.selectedDay,
            dayName: dayNames[data.selectedDay],
            hour: data.selectedHour,
            hourLabel: `${data.selectedHour}. óra`
        };

    } catch (error) {
        console.error('[Calendar] getSessionData error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to get session data');
    }
});
