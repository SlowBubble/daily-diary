document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawUserId = urlParams.get('user_id');
  const userIdParam = rawUserId ? rawUserId.trim() : null;
  const userId = userIdParam || 'Nameless';
  const storageKey = `diary_${userId}`;

  const userTitle = document.getElementById('user-title');
  const backLink = document.getElementById('back-link');
  const totalEntriesEl = document.getElementById('total-entries');
  const daysActiveEl = document.getElementById('days-active');
  const avgEntriesEl = document.getElementById('avg-entries');

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      console.log('Escape pressed, navigating back to diary');
      window.location.href = `index.html${window.location.search}`;
    }
  });

  // Update back link with user_id
  backLink.href = `index.html${window.location.search}`;

  const baseTitle = userIdParam ? `${userIdParam}'s Stats` : 'My Stats';
  userTitle.textContent = baseTitle;

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

  const entries = diaryData.entries || [];
  console.log('Diary entries loaded:', entries.length, entries);

  if (entries.length === 0) {
    console.warn('No entries found for storage key:', storageKey);
    totalEntriesEl.textContent = '0';
    daysActiveEl.textContent = '0';
    avgEntriesEl.textContent = '0';
    return;
  }

  // Sort entries by timestamp
  entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // 1. TIMELINE DATA
  const dayCounts = {};
  entries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dayStr = date.toISOString().split('T')[0];
    dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
  });
  const sortedDays = Object.keys(dayCounts).sort();
  const firstDay = new Date(sortedDays[0]);
  const lastDay = new Date();
  const timelineLabels = [];
  const timelineCounts = [];
  let cumulative = 0;
  let tempDate = new Date(firstDay);
  tempDate.setHours(0, 0, 0, 0);
  const end = new Date(lastDay);
  end.setHours(0, 0, 0, 0);
  while (tempDate <= end) {
    const dayStr = tempDate.toISOString().split('T')[0];
    cumulative += (dayCounts[dayStr] || 0);
    timelineLabels.push(tempDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    timelineCounts.push(cumulative);
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // 2. WORD COUNT HISTOGRAM DATA (max 10 words)
  const wordCountBins = new Array(11).fill(0); // 0, 1, 2, ..., 10+
  const wordFreq = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'when', 'where', 'how', 'who', 'which', 'this', 'that', 'these', 'those', 'then', 'just', 'so', 'than', 'such', 'both', 'through', 'about', 'for', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'to', 'from', 'in', 'on', 'at', 'with', 'by', 'up', 'down', 'out', 'into', 'over', 'under', 'again', 'further', 'once', 'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'very', 'can', 'will', 'shall', 'should', 'would', 'could', 'may', 'might', 'must']);

  entries.forEach(entry => {
    const words = entry.text.toLowerCase().match(/\b\w+\b/g) || [];
    const count = words.length;
    const binIndex = Math.min(count, 10);
    wordCountBins[binIndex]++;

    // For Common Words
    words.forEach(w => {
      if (w.length > 1 && !stopWords.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
  });

  // 3. MOST COMMON WORDS DATA
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('Processed Word Count Bins:', wordCountBins);
  console.log('Top Common Words:', topWords);

  // Render Stats Labels
  totalEntriesEl.textContent = entries.length;
  daysActiveEl.textContent = sortedDays.length;
  avgEntriesEl.textContent = (entries.length / sortedDays.length).toFixed(1);

  // --- CHART DEFAULTS ---
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = '#64748b';

  // --- TIMELINE CHART ---
  const ctx1 = document.getElementById('statsChart').getContext('2d');
  const grad1 = ctx1.createLinearGradient(0, 0, 0, 400);
  grad1.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
  grad1.addColorStop(1, 'rgba(14, 165, 233, 0)');
  new Chart(ctx1, {
    type: 'line',
    data: {
      labels: timelineLabels,
      datasets: [{
        label: 'Cumulative Entries',
        data: timelineCounts,
        borderColor: '#0ea5e9',
        borderWidth: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0ea5e9',
        pointBorderWidth: 2,
        pointRadius: timelineLabels.length > 30 ? 0 : 4,
        backgroundColor: grad1,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10 } },
        y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)', borderDash: [5, 5] } }
      }
    }
  });

  // --- WORD COUNT HISTOGRAM ---
  const ctx2 = document.getElementById('wordCountChart').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
      datasets: [{
        label: 'Entries',
        data: wordCountBins,
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderRadius: 8,
        hoverBackgroundColor: '#0ea5e9'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });

  // --- COMMON WORDS CHART ---
  const ctx3 = document.getElementById('commonWordsChart').getContext('2d');
  new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: topWords.map(w => w[0]),
      datasets: [{
        label: 'Frequency',
        data: topWords.map(w => w[1]),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 8,
        hoverBackgroundColor: '#6366f1'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { grid: { display: false } }
      }
    }
  });
});
