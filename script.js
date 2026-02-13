document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawUserId = urlParams.get('user_id');
    const userIdParam = rawUserId ? rawUserId.trim() : null;
    const userId = userIdParam || 'Nameless';
    const storageKey = `diary_${userId}`;

    const userTitle = document.getElementById('user-title');
    const entriesList = document.getElementById('entries-list');
    const diaryInput = document.getElementById('diary-input');

    if (userIdParam) {
        userTitle.textContent = `${userIdParam}'s Diary`;
    } else {
        userTitle.textContent = 'My diary';
    }

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

    function getTimePeriod(date) {
        const hours = date.getHours();
        if (hours >= 5 && hours < 12) return 'Morning';
        if (hours >= 12 && hours < 17) return 'Afternoon';
        if (hours >= 17 && hours < 21) return 'Evening';
        return 'Night';
    }

    function speak(text) {
        if (!text) return;
        window.speechSynthesis.cancel();
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

        utterance.rate = 0.9; // Slightly slower for a more serious tone
        utterance.pitch = 0.8; // Slightly lower pitch for a more serious tone
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

    function renderEntries() {
        entriesList.innerHTML = '';
        const sortedEntries = [...diaryData.entries].reverse();

        sortedEntries.forEach(entry => {
            const date = new Date(entry.timestamp);
            const period = getTimePeriod(date);

            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-card';

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

    let lastSpokenText = "";

    diaryInput.addEventListener('keydown', (e) => {
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
            speak(wordWithPunct);
            lastSpokenText = wordWithPunct;
            return;
        }

        // Handle Enter
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const fullText = diaryInput.value.trim();

            if (fullText) {
                speak(fullText);
                const newEntry = {
                    timestamp: new Date().toISOString(),
                    text: fullText
                };

                diaryData.entries.push(newEntry);
                localStorage.setItem(storageKey, JSON.stringify(diaryData));

                diaryInput.value = '';
                lastSpokenText = ""; // Reset for next entry
                renderEntries();

                // Optional: Scroll to top of list
                entriesList.scrollTop = 0;
            }
        }
    });

    renderEntries();
});
