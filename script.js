document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id') || 'Nameless';
    const storageKey = `diary_${userId}`;
    
    const userTitle = document.getElementById('user-title');
    const entriesList = document.getElementById('entries-list');
    const diaryInput = document.getElementById('diary-input');
    
    userTitle.textContent = `${userId}'s Diary`;
    
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
    
    diaryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = diaryInput.value.trim();
            
            if (text) {
                const newEntry = {
                    timestamp: new Date().toISOString(),
                    text: text
                };
                
                diaryData.entries.push(newEntry);
                localStorage.setItem(storageKey, JSON.stringify(diaryData));
                
                diaryInput.value = '';
                renderEntries();
                
                // Optional: Scroll to top of list
                entriesList.scrollTop = 0;
            }
        }
    });
    
    renderEntries();
});
