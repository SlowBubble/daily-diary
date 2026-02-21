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
        userTitle.textContent = `${baseTitle} (${count} posts)`;
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

    let currentMode = 'NEW'; // 'NEW', 'VIEW', 'EDIT'
    let selectedEntryIndex = -1; // Index in reversed list
    let originalEditIndex = -1; // Index in original array
    let lastSpokenText = ""; // Track the last word spoken to prevent immediate repeats
    let speechTimeout = null;

    function getTimePeriod(date) {
        const hours = date.getHours();
        if (hours >= 5 && hours < 12) return 'Morning';
        if (hours >= 12 && hours < 17) return 'Afternoon';
        if (hours >= 17 && hours < 21) return 'Evening';
        return 'Night';
    }

    function speak(text, callback) {
        if (!text) return;
        window.speechSynthesis.cancel();
        if (speechTimeout) {
            clearTimeout(speechTimeout);
            speechTimeout = null;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = [
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
            utterance.lang = 'en-GB';
        }

        utterance.rate = 0.9;
        utterance.pitch = 0.8;

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

    function getSpeechDate(date) {
        const period = getTimePeriod(date).toLowerCase();
        const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
        const month = date.toLocaleDateString(undefined, { month: 'long' });
        const day = date.getDate();
        return `Written on the ${period} of ${weekday}, ${month} ${getOrdinal(day)}.`;
    }

    function renderEntries() {
        entriesList.innerHTML = '';
        const sortedEntries = [...diaryData.entries].reverse();

        sortedEntries.forEach((entry, index) => {
            const date = new Date(entry.timestamp);
            const period = getTimePeriod(date);

            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-card';
            if (currentMode === 'VIEW' && index === selectedEntryIndex) {
                entryDiv.classList.add('selected');
                // Ensure the selected entry is visible
                setTimeout(() => {
                    entryDiv.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                }, 0);
            }

            entryDiv.innerHTML = `
                <div class="entry-subheader">
                    <span>${formatDate(date)}</span>
                    <span>${period}</span>
                </div>
                <div class="entry-text">${entry.text}</div>
            `;

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
                    const speechDate = getSpeechDate(new Date(entry.timestamp));
                    speak(entry.text, () => {
                        speechTimeout = setTimeout(() => {
                            speak(speechDate, () => {
                                if (selectedEntryIndex < sortedEntries.length - 1) {
                                    selectedEntryIndex++;
                                    renderEntries();
                                }
                            });
                            speechTimeout = null;
                        }, 230);
                    });
                }
            } else if (e.key === 's') {
                window.location.href = `stats.html${window.location.search}`;
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
                        });
                        speechTimeout = null;
                    }, 230);
                });

                if (currentMode === 'EDIT' && originalEditIndex !== -1) {
                    diaryData.entries[originalEditIndex].text = fullText;
                    localStorage.setItem(storageKey, JSON.stringify(diaryData));
                    const currentSelected = selectedEntryIndex;
                    setMode('VIEW', currentSelected);
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
                }
            }
        }
    });

    setMode('NEW');
});
