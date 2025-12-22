// Book class to represent each book
class Book {
    constructor(id, name, author, type, total) {
        this.id = id;
        this.name = name;
        this.author = author;
        this.type = type; // 'paper' or 'audio'
        this.total = total; // total pages or total minutes
        this.logs = []; // array of {date, amount}
        this.completed = false;
    }

    getTotalProgress() {
        return this.logs.reduce((sum, log) => sum + log.amount, 0);
    }

    getProgressPercentage() {
        if (this.total === 0) return 0;
        const progress = this.getTotalProgress();
        return Math.min(Math.round((progress / this.total) * 100), 100);
    }

    getRemainingAmount() {
        return Math.max(this.total - this.getTotalProgress(), 0);
    }
}

// Application state
let books = [];
let currentStreak = 0;
let longestStreak = 0;

// DOM elements
const addBookForm = document.getElementById('add-book-form');
const booksList = document.getElementById('books-list');
const emptyState = document.getElementById('empty-state');
const paperFields = document.getElementById('paper-fields');
const audioFields = document.getElementById('audio-fields');
const logModal = document.getElementById('log-modal');
const logsModal = document.getElementById('logs-modal');
const logForm = document.getElementById('log-form');
const logPaperField = document.getElementById('log-paper-field');
const logAudioField = document.getElementById('log-audio-field');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadStreaks();
    updateStreaks();
    renderBooks();
    renderStreakDisplay();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Search functionality for completed books
    const searchCompletedInput = document.getElementById('search-completed-input');
    if (searchCompletedInput) {
        searchCompletedInput.addEventListener('input', handleSearchCompleted);
    }

    // Toggle between paper and audio fields
    document.querySelectorAll('input[name="book-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'paper') {
                paperFields.style.display = 'block';
                audioFields.style.display = 'none';
            } else {
                paperFields.style.display = 'none';
                audioFields.style.display = 'block';
            }
        });
    });

    // Add book form submission
    addBookForm.addEventListener('submit', handleAddBook);

    // Log form submission
    logForm.addEventListener('submit', handleAddLog);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            logModal.style.display = 'none';
            logsModal.style.display = 'none';
        });
    });

    // Cancel log button
    document.getElementById('cancel-log').addEventListener('click', () => {
        logModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === logModal) {
            logModal.style.display = 'none';
        }
        if (e.target === logsModal) {
            logsModal.style.display = 'none';
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(tabName);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
    }
}

// Handle add book
function handleAddBook(e) {
    e.preventDefault();

    const name = document.getElementById('book-name').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const type = document.querySelector('input[name="book-type"]:checked').value;

    let total;
    if (type === 'paper') {
        total = parseInt(document.getElementById('total-pages').value) || 0;
    } else {
        const hours = parseInt(document.getElementById('total-hours').value) || 0;
        const minutes = parseInt(document.getElementById('total-minutes').value) || 0;
        total = hours * 60 + minutes;
    }

    if (!name || !author || total <= 0) {
        alert('Моля, попълнете всички полета!');
        return;
    }

    const id = Date.now().toString();
    const book = new Book(id, name, author, type, total);
    books.push(book);
    saveBooks();
    renderBooks();
    addBookForm.reset();
    
    // Switch to book list tab after adding
    switchTab('book-list');
}

// Handle add log
function handleAddLog(e) {
    e.preventDefault();

    const bookId = document.getElementById('log-book-id').value;
    const date = document.getElementById('log-date').value;
    
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    let amount;
    if (book.type === 'paper') {
        amount = parseInt(document.getElementById('log-pages').value) || 0;
    } else {
        const hours = parseInt(document.getElementById('log-hours').value) || 0;
        const minutes = parseInt(document.getElementById('log-minutes').value) || 0;
        amount = hours * 60 + minutes;
    }

    if (amount <= 0) {
        alert('Моля, въведете валидна стойност!');
        return;
    }

    book.logs.push({ date, amount });
    book.logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    saveBooks();
    updateStreaks();
    saveStreaks();
    renderBooks();
    renderStreakDisplay();
    logModal.style.display = 'none';
    logForm.reset();
}

// Open log modal
function openLogModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('log-book-id').value = bookId;
    document.getElementById('log-date').valueAsDate = new Date();

    if (book.type === 'paper') {
        logPaperField.style.display = 'block';
        logAudioField.style.display = 'none';
    } else {
        logPaperField.style.display = 'none';
        logAudioField.style.display = 'block';
    }

    logModal.style.display = 'block';
}

// Open logs history modal
function openLogsModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('logs-modal-title').textContent = `История на прогреса: ${book.name}`;
    
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '';

    if (book.logs.length === 0) {
        logsList.innerHTML = '<div class="no-logs">Все още няма записан прогрес</div>';
    } else {
        book.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const dateFormatted = new Date(log.date).toLocaleDateString('bg-BG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let amountText;
            if (book.type === 'paper') {
                amountText = `${log.amount} страници`;
            } else {
                const hours = Math.floor(log.amount / 60);
                const minutes = log.amount % 60;
                amountText = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;
            }

            logEntry.innerHTML = `
                <span class="log-date">${dateFormatted}</span>
                <span class="log-amount">${amountText}</span>
            `;
            logsList.appendChild(logEntry);
        });
    }

    logsModal.style.display = 'block';
}

// Toggle book completion
function toggleBookCompletion(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    book.completed = !book.completed;
    saveBooks();
    renderBooks();
}

// Delete book
function deleteBook(bookId) {
    if (confirm('Сигурни ли сте, че искате да изтриете тази книга?')) {
        books = books.filter(b => b.id !== bookId);
        saveBooks();
        renderBooks();
    }
}

// Render books list
function renderBooks() {
    // Render all books
    if (books.length === 0) {
        booksList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        booksList.innerHTML = '';

        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksList.appendChild(bookCard);
        });
    }

    // Render completed books
    renderCompletedBooks();
}

// Create book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = `book-card ${book.completed ? 'completed' : ''}`;

    const progress = book.getTotalProgress();
    const percentage = book.getProgressPercentage();
    const remaining = book.getRemainingAmount();

    let totalText, progressText, remainingText;
    if (book.type === 'paper') {
        totalText = `${book.total} страници`;
        progressText = `${progress} прочетени`;
        remainingText = `${remaining} остават`;
    } else {
        const totalHours = Math.floor(book.total / 60);
        const totalMinutes = book.total % 60;
        totalText = totalHours > 0 ? `${totalHours}ч ${totalMinutes}мин` : `${totalMinutes}мин`;

        const progressHours = Math.floor(progress / 60);
        const progressMinutes = progress % 60;
        progressText = progressHours > 0 ? `${progressHours}ч ${progressMinutes}мин изслушани` : `${progressMinutes}мин изслушани`;

        const remainingHours = Math.floor(remaining / 60);
        const remainingMinutes = remaining % 60;
        remainingText = remainingHours > 0 ? `${remainingHours}ч ${remainingMinutes}мин остават` : `${remainingMinutes}мин остават`;
    }

    card.innerHTML = `
        <div class="book-header">
            <div class="book-info">
                <h3>${book.name}</h3>
                <div class="author">от ${book.author}</div>
                <span class="type-badge ${book.type}">
                    ${book.type === 'paper' ? '📖 Хартиена' : '🎧 Аудио'} • ${totalText}
                </span>
            </div>
            <div class="book-actions">
                <button class="btn btn-success" onclick="openLogModal('${book.id}')">+ Прогрес</button>
                <button class="btn btn-complete" onclick="toggleBookCompletion('${book.id}')">
                    ${book.completed ? '↩️ Незавършена' : '✓ Завършена'}
                </button>
                <button class="btn btn-danger" onclick="deleteBook('${book.id}')">✕</button>
            </div>
        </div>

        ${book.completed ? '<div class="completed-badge">✓ Завършена</div>' : ''}

        <div class="progress-section">
            <div class="progress-info">
                <span>${progressText}</span>
                <span>${book.completed ? '100%' : remainingText}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percentage}%">
                    ${percentage}%
                </div>
            </div>
        </div>

        <div class="logs-summary" onclick="openLogsModal('${book.id}')">
            <span>📊 История на прогреса (${book.logs.length} записа) - Кликни за детайли</span>
        </div>
    `;

    return card;
}

// Calculate streaks based on all log dates
function updateStreaks() {
    // Get all unique dates from all books
    const allDates = new Set();
    
    books.forEach(book => {
        book.logs.forEach(log => {
            allDates.add(log.date);
        });
    });
    
    if (allDates.size === 0) {
        currentStreak = 0;
        longestStreak = 0;
        return;
    }
    
    // Sort dates in descending order (newest first)
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
    
    // Calculate current streak
    currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
        const logDate = new Date(sortedDates[i]);
        logDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        if (logDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    // Calculate longest streak
    let tempStreak = 1;
    let maxStreak = 1;
    
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const currentDate = new Date(sortedDates[i]);
        const nextDate = new Date(sortedDates[i + 1]);
        currentDate.setHours(0, 0, 0, 0);
        nextDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.round((currentDate - nextDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            tempStreak++;
            if (tempStreak > maxStreak) {
                maxStreak = tempStreak;
            }
        } else {
            tempStreak = 1;
        }
    }
    
    longestStreak = Math.max(longestStreak, maxStreak, currentStreak);
}

// Save streaks to localStorage
function saveStreaks() {
    localStorage.setItem('streaks', JSON.stringify({
        currentStreak,
        longestStreak
    }));
}

// Load streaks from localStorage
function loadStreaks() {
    const saved = localStorage.getItem('streaks');
    if (saved) {
        const streaks = JSON.parse(saved);
        currentStreak = streaks.currentStreak || 0;
        longestStreak = streaks.longestStreak || 0;
    }
}

// Render streak display
function renderStreakDisplay() {
    const currentStreakEl = document.getElementById('current-streak');
    const longestStreakEl = document.getElementById('longest-streak');
    
    if (currentStreakEl) {
        currentStreakEl.textContent = currentStreak;
    }
    if (longestStreakEl) {
        longestStreakEl.textContent = longestStreak;
    }
}

// Save books to localStorage
function saveBooks() {
    localStorage.setItem('books', JSON.stringify(books));
}

// Load books from localStorage
function loadBooks() {
    const saved = localStorage.getItem('books');
    if (saved) {
        const parsed = JSON.parse(saved);
        books = parsed.map(data => {
            const book = new Book(data.id, data.name, data.author, data.type, data.total);
            book.logs = data.logs || [];
            book.completed = data.completed || false;
            return book;
        });
    }
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    const bookCards = document.querySelectorAll('.book-card');
    let visibleCount = 0;
    
    bookCards.forEach(card => {
        const bookName = card.querySelector('h3').textContent.toLowerCase();
        const bookAuthor = card.querySelector('.author').textContent.toLowerCase();
        
        if (bookName.includes(searchTerm) || bookAuthor.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide empty state
    const emptyState = document.getElementById('empty-state');
    if (visibleCount === 0 && books.length > 0) {
        emptyState.style.display = 'block';
        emptyState.textContent = 'Няма намерени книги за "' + e.target.value + '"';
    } else if (books.length === 0) {
        emptyState.style.display = 'block';
        emptyState.textContent = 'Все още няма добавени книги. Добави първата си книга отгоре! 📖';
    } else {
        emptyState.style.display = 'none';
    }
}

// Render completed books
function renderCompletedBooks() {
    const completedBooksList = document.getElementById('completed-books-list');
    const completedEmptyState = document.getElementById('completed-empty-state');
    
    const completedBooks = books.filter(book => book.completed);
    
    if (completedBooks.length === 0) {
        completedBooksList.innerHTML = '';
        completedEmptyState.style.display = 'block';
        return;
    }
    
    completedEmptyState.style.display = 'none';
    completedBooksList.innerHTML = '';
    
    completedBooks.forEach(book => {
        const bookCard = createBookCard(book);
        completedBooksList.appendChild(bookCard);
    });
}

// Handle search for completed books
function handleSearchCompleted(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    const bookCards = document.querySelectorAll('#completed-books-list .book-card');
    let visibleCount = 0;
    
    bookCards.forEach(card => {
        const bookName = card.querySelector('h3').textContent.toLowerCase();
        const bookAuthor = card.querySelector('.author').textContent.toLowerCase();
        
        if (bookName.includes(searchTerm) || bookAuthor.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide empty state
    const completedEmptyState = document.getElementById('completed-empty-state');
    const completedBooks = books.filter(book => book.completed);
    
    if (visibleCount === 0 && completedBooks.length > 0) {
        completedEmptyState.style.display = 'block';
        completedEmptyState.textContent = 'Няма намерени книги за "' + e.target.value + '"';
    } else if (completedBooks.length === 0) {
        completedEmptyState.style.display = 'block';
        completedEmptyState.textContent = 'Все още няма завършени книги. 🎉';
    } else {
        completedEmptyState.style.display = 'none';
    }
}
