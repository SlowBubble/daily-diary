import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-ai.js";

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawUserId = urlParams.get('user_id');
    const userIdParam = rawUserId ? rawUserId.trim() : null;
    const userId = userIdParam || 'Nameless';
    const storageKey = `diary_${userId}`;

    const userTitle = document.getElementById('user-title');
    const entriesList = document.getElementById('entries-list');
    const diaryInput = document.getElementById('diary-input');

    function updateHeader() {
        const count = diaryData.entries.length;
        const baseTitle = userIdParam ? `${userIdParam}'s Diary` : 'My diary';
        const statsUrl = `stats.html${window.location.search}`;
        userTitle.innerHTML = `${baseTitle} <a href="${statsUrl}" class="stats-link">(${count} posts)</a>`;
    }

    const appContainer = document.querySelector('.app-container');

    // Load entries
    let diaryData = { entries: [] };
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        try {
            diaryData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse storage', e);
        }
    }

    updateHeader();

    // Firebase & AI Init
    const firebaseConfig = {
        apiKey: "AIzaSyAAG4cgpGXTDFdKxCwxpEiIm0xsjKDdy3I",
        authDomain: "diagram-flow.firebaseapp.com",
        projectId: "diagram-flow",
        storageBucket: "diagram-flow.firebasestorage.app",
        messagingSenderId: "701657640541",
        appId: "1:701657640541:web:fa9d373423f009c60627b4",
        measurementId: "G-RJZ7XPTE4Z"
    };

    const app = initializeApp(firebaseConfig);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

    async function annotateSingleEntry(entry) {
        if (!entry || entry.annotations) return; // Guard clause
        const prompt = `For the following diary entry, provide two annotations in JSON format: 
1. "canto": A Cantonese translation of the entry.
2. "category": One of "Meal", "Activity", "Thought", "Event", "Other". 
   - Meal: Discussing what I ate or drank.
   - Activity: Something I did.
   - Event: Something that happened.

Entry: "${entry.text}"

Return ONLY the JSON object. Example: {"canto": "...", "category": "..."}`;

        console.log(`[AI] Generating annotations for: "${entry.text}"`);
        console.log(`[AI] Prompt:`, prompt);

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            console.log(`[AI] Raw Response:`, responseText);

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const annotations = JSON.parse(jsonMatch[0]);
                console.log(`[AI] Parsed Annotations:`, annotations);
                entry.annotations = annotations;
                localStorage.setItem(storageKey, JSON.stringify(diaryData));
                renderEntries();
            }
        } catch (e) {
            console.error("AI annotation failed", e);
        }
    }

    let currentMode = 'NEW'; // 'NEW', 'VIEW', 'EDIT'
    let selectedEntryIndex = -1; // Index in reversed list
    let originalEditIndex = -1; // Index in original array
    let lastSpokenText = ""; // Track the last word spoken to prevent immediate repeats
    let speechTimeout = null;
    let cantoMode = urlParams.get('canto') === '1';

    function getTimePeriod(date) {
        const hours = date.getHours();
        if (hours >= 5 && hours < 12) return 'Morning';
        if (hours >= 12 && hours < 17) return 'Afternoon';
        if (hours >= 17 && hours < 21) return 'Evening';
        return 'Night';
    }

    function speak(text, callback = null, isCanto = false) {
        if (!text) return;
        window.speechSynthesis.cancel();
        if (speechTimeout) {
            clearTimeout(speechTimeout);
            speechTimeout = null;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = isCanto ? [
            'Sin-Ji',
            'Google 粵語',
            'Hong Kong',
            'zh-HK'
        ] : [
            'Google UK English Male',
            'Daniel',
            'English (United Kingdom)'
        ];

        let selectedVoice = null;
        for (const name of preferredVoices) {
            selectedVoice = voices.find(v => v.name.includes(name));
            if (selectedVoice) break;
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        } else {
            // Fallback for lang
            utterance.lang = isCanto ? 'zh-HK' : 'en-GB';
        }

        utterance.rate = 0.9;
        utterance.pitch = isCanto ? 1.0 : 0.8;

        if (callback) {
            utterance.onend = callback;
        }

        window.speechSynthesis.speak(utterance);
    }

    function formatDate(date) {
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function getSpeechDate(date, forceCanto = false) {
        const isCanto = forceCanto || cantoMode;
        if (isCanto) {
            const periodMap = {
                'Morning': '朝早',
                'Afternoon': '下晝',
                'Evening': '夜晚',
                'Night': '深夜'
            };
            const period = periodMap[getTimePeriod(date)];
            const weekday = date.toLocaleDateString('zh-HK', { weekday: 'long' });
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `喺${month}月${day}日${weekday}嘅${period}寫嘅。`;
        }
        const period = getTimePeriod(date).toLowerCase();
        const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
        const month = date.toLocaleDateString(undefined, { month: 'long' });
        const day = date.getDate();
        return `Written on the ${period} of ${weekday}, ${month} ${getOrdinal(day)}.`;
    }

    function renderEntries() {
        entriesList.innerHTML = '';
        const sortedEntries = [...diaryData.entries].reverse();
        let lastDateStr = null;

        sortedEntries.forEach((entry, index) => {
            const date = new Date(entry.timestamp);
            const dateStr = formatDate(date);
            const period = getTimePeriod(date);

            if (dateStr !== lastDateStr) {
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                divider.textContent = dateStr;
                entriesList.appendChild(divider);
                lastDateStr = dateStr;
            }

            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-card';
            if (currentMode === 'VIEW' && index === selectedEntryIndex) {
                entryDiv.classList.add('selected');
                // Ensure the selected entry is visible
                setTimeout(() => {
                    entryDiv.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                }, 0);
            }

            const categoryHtml = entry.annotations ? `
                <span class="annotation-category category-${entry.annotations.category.toLowerCase()}">${entry.annotations.category}</span>
            ` : '';

            const displayText = (cantoMode && entry.annotations && entry.annotations.canto)
                ? entry.annotations.canto
                : entry.text;

            entryDiv.innerHTML = `
                <div class="entry-text">${displayText}</div>
                <div class="entry-footer">
                    ${categoryHtml}
                    <span class="period-toggle" title="Click to cycle period">${period}</span>
                </div>
            `;

            const periodToggle = entryDiv.querySelector('.period-toggle');
            periodToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const d = new Date(entry.timestamp);
                const hours = d.getHours();
                let nextHour;

                if (hours >= 5 && hours < 12) nextHour = 12;      // Morning -> Afternoon
                else if (hours >= 12 && hours < 17) nextHour = 17; // Afternoon -> Evening
                else if (hours >= 17 && hours < 21) nextHour = 21; // Evening -> Night
                else nextHour = 5;                                 // Night -> Morning

                d.setHours(nextHour, 0, 0, 0);
                entry.timestamp = d.toISOString();
                localStorage.setItem(storageKey, JSON.stringify(diaryData));
                renderEntries();
            });

            entriesList.appendChild(entryDiv);
        });
    }

    function setMode(mode, entryIndex = -1) {
        currentMode = mode;
        appContainer.classList.remove('view-mode');
        lastSpokenText = "";

        if (mode === 'VIEW') {
            appContainer.classList.add('view-mode');
            diaryInput.blur();
            if (entryIndex !== -1) {
                selectedEntryIndex = entryIndex;
            } else if (selectedEntryIndex === -1) {
                selectedEntryIndex = 0;
            }
            renderEntries();
        } else if (mode === 'NEW') {
            selectedEntryIndex = -1;
            originalEditIndex = -1;
            diaryInput.value = '';
            renderEntries();
            diaryInput.focus();
        } else if (mode === 'EDIT') {
            const sortedEntries = [...diaryData.entries].reverse();
            const entry = sortedEntries[selectedEntryIndex];
            if (entry) {
                diaryInput.value = entry.text;
                originalEditIndex = diaryData.entries.indexOf(entry);
                diaryInput.focus();
            }
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (currentMode === 'VIEW') {
                setMode('NEW');
            } else {
                setMode('VIEW');
            }
            return;
        }

        if (currentMode === 'VIEW') {
            const sortedEntries = [...diaryData.entries].reverse();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedEntryIndex < sortedEntries.length - 1) {
                    selectedEntryIndex++;
                    renderEntries();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedEntryIndex > 0) {
                    selectedEntryIndex--;
                    renderEntries();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (sortedEntries.length > 0) {
                    setMode('EDIT');
                }
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                const entry = sortedEntries[selectedEntryIndex];
                if (entry) {
                    const isCanto = cantoMode && entry.annotations && entry.annotations.canto;
                    const textToSpeak = isCanto ? entry.annotations.canto : entry.text;
                    const speechDate = getSpeechDate(new Date(entry.timestamp), isCanto);
                    speak(textToSpeak, () => {
                        speechTimeout = setTimeout(() => {
                            speak(speechDate, () => {
                                if (selectedEntryIndex < sortedEntries.length - 1) {
                                    selectedEntryIndex++;
                                    renderEntries();
                                }
                            }, isCanto);
                            speechTimeout = null;
                        }, 230);
                    }, isCanto);
                }
            } else if (e.key === 's') {
                window.location.href = `stats.html${window.location.search}`;
            } else if (e.key === 'c') {
                cantoMode = !cantoMode;
                const newParams = new URLSearchParams(window.location.search);
                if (cantoMode) newParams.set('canto', '1');
                else newParams.delete('canto');
                const newQuery = newParams.toString();
                const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '');
                window.history.replaceState({}, '', newUrl);
                renderEntries();
            }
        }
    });

    diaryInput.addEventListener('keydown', (e) => {
        // Only handle typing logic if in NEW or EDIT mode
        if (currentMode === 'VIEW') return;

        const punctuation = ['.', ',', '!', '?', ';', ':'];
        const text = diaryInput.value;
        const cursorPos = diaryInput.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos).trim();
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1] || "";

        // Handle Space
        if (e.key === ' ' || e.code === 'Space') {
            if (currentWord && currentWord !== lastSpokenText) {
                speak(currentWord);
                lastSpokenText = currentWord;
            }
            return;
        }

        // Handle Punctuation
        if (punctuation.includes(e.key)) {
            const wordWithPunct = currentWord + e.key;
            if (wordWithPunct !== lastSpokenText) {
                speak(wordWithPunct);
                lastSpokenText = wordWithPunct;
            }
            return;
        }

        // Reset speech memory for any other key (backspace, letters, etc.)
        // but ignore modifier keys so they don't trigger a re-read
        if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
            lastSpokenText = "";
        }

        // Handle Enter
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const fullText = diaryInput.value.trim();

            if (fullText) {
                let speechDate;
                let newTimestamp = null;
                if (currentMode === 'EDIT' && originalEditIndex !== -1) {
                    speechDate = getSpeechDate(new Date(diaryData.entries[originalEditIndex].timestamp));
                } else {
                    newTimestamp = new Date().toISOString();
                    speechDate = getSpeechDate(new Date(newTimestamp));
                }

                speak(fullText, () => {
                    speechTimeout = setTimeout(() => {
                        speak(speechDate, () => {
                            if (currentMode === 'VIEW') {
                                const sortedEntries = [...diaryData.entries].reverse();
                                if (selectedEntryIndex < sortedEntries.length - 1) {
                                    selectedEntryIndex++;
                                    renderEntries();
                                }
                            }
                        }, cantoMode);
                        speechTimeout = null;
                    }, 230);
                }, false);

                if (currentMode === 'EDIT' && originalEditIndex !== -1) {
                    const entry = diaryData.entries[originalEditIndex];
                    entry.text = fullText;
                    // Reset annotations on edit
                    delete entry.annotations;
                    localStorage.setItem(storageKey, JSON.stringify(diaryData));
                    const currentSelected = selectedEntryIndex;
                    setMode('VIEW', currentSelected);
                    // Annotate asynchronously
                    annotateSingleEntry(entry);
                } else {
                    const newEntry = {
                        timestamp: newTimestamp,
                        text: fullText
                    };
                    diaryData.entries.push(newEntry);
                    localStorage.setItem(storageKey, JSON.stringify(diaryData));
                    updateHeader();

                    diaryInput.value = '';
                    lastSpokenText = "";
                    renderEntries();
                    entriesList.scrollTop = 0;
                    // Annotate asynchronously
                    annotateSingleEntry(newEntry);
                }
            }
        }
    });

    setMode('NEW');
});
