// ========================
// DATA MODEL
// ========================

// Book class to represent each book
class Book {
    constructor(id, name, author, type, total, category, coverUrl = '') {
        this.id = id;
        this.name = name;
        this.author = author;
        this.type = type; // 'paper' or 'audio'
        this.total = total; // total pages or total minutes
        this.category = category; // 'mama', 'yavor', or 'choice'
        this.coverUrl = coverUrl; // book cover image URL
        this.logs = []; // array of {date, amount}
        this.status = 'planned'; // 'planned', 'in-progress', 'completed'
        this.completed = false; // legacy support
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

    updateStatus() {
        const progress = this.getTotalProgress();
        if (progress === 0) {
            this.status = 'planned';
        } else if (progress >= this.total) {
            this.status = 'completed';
            this.completed = true;
        } else {
            this.status = 'in-progress';
        }
    }
}

// ========================
// APPLICATION STATE
// ========================

let books = [];
let currentStreak = 0;
let longestStreak = 0;
let activityFeed = []; // {type, message, date, bookName}
let achievements = [];
let dailyGoal = 50; // pages per day
let theme = 'light';
let currentCategoryFilter = 'mama'; // Track current category filter
let hiddenSuggestions = { names: [], authors: [] }; // Hidden autocomplete suggestions

// ========================
// DOM ELEMENTS
// ========================

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

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadBooks();
    loadStreaks();
    loadActivityFeed();
    loadAchievements();
    loadHiddenSuggestions();
    updateStreaks();
    renderBooks();
    renderStreakDisplay();
    renderStatistics();
    renderActivityFeed();
    renderAchievements();
    setupEventListeners();
    initializeAchievements();
    updateAutocomplete(); // Update autocomplete lists
    // Set default filter to 'mama'
    filterBooksByCategory('mama');
});

// ========================
// EVENT LISTENERS
// ========================

function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
            
            // Update active state
            document.querySelectorAll('.tab-btn').forEach(item => {
                item.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
        });
    });

    // Category filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(item => {
                item.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            
            // Filter books
            const category = e.currentTarget.dataset.category;
            currentCategoryFilter = category; // Save current filter
            filterBooksByCategory(category);
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
            document.getElementById('category-modal').style.display = 'none';
        });
    });

    // Cancel log button
    document.getElementById('cancel-log').addEventListener('click', () => {
        logModal.style.display = 'none';
    });

    // Category modal buttons
    document.getElementById('save-category').addEventListener('click', changeBookCategory);
    document.getElementById('cancel-category').addEventListener('click', () => {
        document.getElementById('category-modal').style.display = 'none';
    });

    // Edit modal
    if (editBookForm) {
        editBookForm.addEventListener('submit', handleEditBook);
    }
    
    document.getElementById('cancel-edit').addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    
    // Toggle between paper and audio fields in edit modal
    document.querySelectorAll('input[name="edit-book-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'paper') {
                editPaperFields.style.display = 'block';
                editAudioFields.style.display = 'none';
            } else {
                editPaperFields.style.display = 'none';
                editAudioFields.style.display = 'block';
            }
        });
    });
    
    // Cover preview for add and edit forms
    document.getElementById('book-cover').addEventListener('input', (e) => {
        showCoverPreview('cover-preview', e.target.value);
    });
    
    document.getElementById('edit-book-cover').addEventListener('input', (e) => {
        showCoverPreview('edit-cover-preview', e.target.value);
    });
    
    // Export/Import buttons
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-file').addEventListener('change', importData);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === logModal) {
            logModal.style.display = 'none';
        }
        if (e.target === logsModal) {
            logsModal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
        const categoryModal = document.getElementById('category-modal');
        if (e.target === categoryModal) {
            categoryModal.style.display = 'none';
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
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
    
    // Update tab buttons active state
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update statistics when switching to statistics tab
    if (tabName === 'statistics') {
        renderStatistics();
        renderCharts();
    }
}

// Handle add book
function handleAddBook(e) {
    e.preventDefault();

    const name = document.getElementById('book-name').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const type = document.querySelector('input[name="book-type"]:checked').value;
    const category = document.querySelector('input[name="book-category"]:checked').value;
    const coverUrl = document.getElementById('book-cover').value.trim();

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
    const book = new Book(id, name, author, type, total, category, coverUrl);
    books.push(book);
    saveBooks();
    renderBooks();
    addBookForm.reset();
    
    // Reset cover preview
    showCoverPreview('cover-preview', '');
    
    // Update autocomplete lists
    updateAutocomplete();
    
    // Add activity and check achievements
    addActivity('Добавяне', `Добавена книга "${name}"`, name);
    checkAchievements();
    renderStatistics();
    renderCharts();
    
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
    book.updateStatus();

    saveBooks();
    updateStreaks();
    saveStreaks();
    renderBooks();
    renderStreakDisplay();
    renderStatistics();
    
    // Add activity
    const unit = book.type === 'paper' ? 'страници' : 'минути';
    addActivity('Прогрес', `${amount} ${unit} за "${book.name}"`, book.name);
    checkAchievements();
    
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

// Open category modal
function openCategoryModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('category-book-id').value = bookId;
    document.getElementById('category-book-name').textContent = book.name;
    
    // Set current category
    const categoryRadios = document.querySelectorAll('input[name="change-category"]');
    categoryRadios.forEach(radio => {
        radio.checked = radio.value === book.category;
    });

    document.getElementById('category-modal').style.display = 'block';
}

// Change book category
function changeBookCategory() {
    const bookId = document.getElementById('category-book-id').value;
    const newCategory = document.querySelector('input[name="change-category"]:checked').value;
    
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    book.category = newCategory;
    saveBooks();
    renderBooks();
    document.getElementById('category-modal').style.display = 'none';
}

// Toggle book completion
function toggleBookCompletion(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // If marking as completed, ensure progress is 100%
    if (!book.completed) {
        const remaining = book.getRemainingAmount();
        if (remaining > 0) {
            // Add remaining amount as a log entry for today
            const today = new Date().toISOString().split('T')[0];
            book.logs.push({ date: today, amount: remaining });
            book.logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        addActivity('Завършване', `Завършена книга "${book.name}"`, book.name);
    }

    book.completed = !book.completed;
    book.updateStatus();
    saveBooks();
    updateStreaks();
    saveStreaks();
    renderBooks();
    renderStreakDisplay();
    renderStatistics();
    checkAchievements();
}

// Delete book
function deleteBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (confirm('Сигурни ли сте, че искате да изтриете тази книга?')) {
        addActivity('Изтриване', `Изтрита книга "${book.name}"`, book.name);
        books = books.filter(b => b.id !== bookId);
        saveBooks();
        renderBooks();
        renderStatistics();
    }
}

// Natural sort function for book names with numbers
function naturalSort(a, b) {
    return a.name.localeCompare(b.name, 'bg', { numeric: true, sensitivity: 'base' });
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

        // Group books by category
        const mamaBooks = books.filter(book => book.category === 'mama');
        const yavorBooks = books.filter(book => book.category === 'yavor');
        const choiceBooks = books.filter(book => book.category === 'choice');

        // Render Mama category
        if (mamaBooks.length > 0) {
            const mamaCategorySection = document.createElement('div');
            mamaCategorySection.className = 'category-section';
            mamaCategorySection.innerHTML = '<h3 class="category-title">📚 Уговорка с Мама</h3>';
            booksList.appendChild(mamaCategorySection);

            // Paper books in Mama category
            const mamaPaperBooks = mamaBooks.filter(book => book.type === 'paper')
                .sort(naturalSort);
            if (mamaPaperBooks.length > 0) {
                const paperSection = document.createElement('div');
                paperSection.className = 'type-section';
                paperSection.innerHTML = '<h4 class="type-title">📖 Хартиени книги</h4>';
                booksList.appendChild(paperSection);

                mamaPaperBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }

            // Audio books in Mama category
            const mamaAudioBooks = mamaBooks.filter(book => book.type === 'audio')
                .sort(naturalSort);
            if (mamaAudioBooks.length > 0) {
                const audioSection = document.createElement('div');
                audioSection.className = 'type-section';
                audioSection.innerHTML = '<h4 class="type-title">🎧 Аудио книги</h4>';
                booksList.appendChild(audioSection);

                mamaAudioBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }
        }

        // Render Yavor category
        if (yavorBooks.length > 0) {
            const yavorCategorySection = document.createElement('div');
            yavorCategorySection.className = 'category-section';
            yavorCategorySection.innerHTML = '<h3 class="category-title">📚 Уговорка с Явор</h3>';
            booksList.appendChild(yavorCategorySection);

            // Paper books in Yavor category
            const yavorPaperBooks = yavorBooks.filter(book => book.type === 'paper')
                .sort(naturalSort);
            if (yavorPaperBooks.length > 0) {
                const paperSection = document.createElement('div');
                paperSection.className = 'type-section';
                paperSection.innerHTML = '<h4 class="type-title">📖 Хартиени книги</h4>';
                booksList.appendChild(paperSection);

                yavorPaperBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }

            // Audio books in Yavor category
            const yavorAudioBooks = yavorBooks.filter(book => book.type === 'audio')
                .sort(naturalSort);
            if (yavorAudioBooks.length > 0) {
                const audioSection = document.createElement('div');
                audioSection.className = 'type-section';
                audioSection.innerHTML = '<h4 class="type-title">🎧 Аудио книги</h4>';
                booksList.appendChild(audioSection);

                yavorAudioBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }
        }

        // Render Choice category
        if (choiceBooks.length > 0) {
            const choiceCategorySection = document.createElement('div');
            choiceCategorySection.className = 'category-section';
            choiceCategorySection.innerHTML = '<h3 class="category-title">📚 По желание</h3>';
            booksList.appendChild(choiceCategorySection);

            // Paper books in Choice category
            const choicePaperBooks = choiceBooks.filter(book => book.type === 'paper')
                .sort(naturalSort);
            if (choicePaperBooks.length > 0) {
                const paperSection = document.createElement('div');
                paperSection.className = 'type-section';
                paperSection.innerHTML = '<h4 class="type-title">📖 Хартиени книги</h4>';
                booksList.appendChild(paperSection);

                choicePaperBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }

            // Audio books in Choice category
            const choiceAudioBooks = choiceBooks.filter(book => book.type === 'audio')
                .sort(naturalSort);
            if (choiceAudioBooks.length > 0) {
                const audioSection = document.createElement('div');
                audioSection.className = 'type-section';
                audioSection.innerHTML = '<h4 class="type-title">🎧 Аудио книги</h4>';
                booksList.appendChild(audioSection);

                choiceAudioBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksList.appendChild(bookCard);
                });
            }
        }
    }

    // Render completed books
    renderCompletedBooks();
    
    // Reapply current category filter
    if (currentCategoryFilter) {
        filterBooksByCategory(currentCategoryFilter);
    }
}

// Generate gradient based on percentage
function getProgressGradient(percentage) {
    if (percentage <= 20) {
        return `linear-gradient(90deg, #dc3545 0%, #dc3545 100%)`;
    } else if (percentage <= 40) {
        const orangePos = ((percentage - 20) / 20) * 100;
        return `linear-gradient(90deg, #dc3545 0%, #fd7e14 ${orangePos}%)`;
    } else if (percentage <= 60) {
        const yellowPos = ((percentage - 40) / 20) * 100;
        return `linear-gradient(90deg, #dc3545 0%, #fd7e14 33%, #ffc107 ${33 + yellowPos * 0.67}%)`;
    } else if (percentage <= 80) {
        const lightGreenPos = ((percentage - 60) / 20) * 100;
        return `linear-gradient(90deg, #dc3545 0%, #fd7e14 25%, #ffc107 50%, #90ee90 ${50 + lightGreenPos * 0.5}%)`;
    } else {
        const greenPos = ((percentage - 80) / 20) * 100;
        return `linear-gradient(90deg, #dc3545 0%, #fd7e14 20%, #ffc107 40%, #90ee90 60%, #28a745 ${60 + greenPos * 0.4}%)`;
    }
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
                ${book.coverUrl ? `<div class="book-cover-small"><img src="${book.coverUrl}" alt="${book.name}" onerror="this.style.display='none'"></div>` : ''}
                <div>
                    <h3>${book.name}</h3>
                    <div class="author">от ${book.author}</div>
                    <span class="type-badge ${book.type}">
                        ${book.type === 'paper' ? '📖 Хартиена' : '🎧 Аудио'} • ${totalText}
                    </span>
                </div>
            </div>
            <div class="book-actions">
                <button class="btn btn-success" onclick="openLogModal('${book.id}')">+ Прогрес</button>
                <button class="btn btn-info" onclick="openEditModal('${book.id}')" title="Редактирай">✏️</button>
                <button class="btn btn-category" onclick="openCategoryModal('${book.id}')" title="Промени категория">📁</button>
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
                <div class="progress-bar" style="width: ${percentage}%; background: ${getProgressGradient(percentage)}">
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
    // Update in statistics tab
    const currentStreakStatsEl = document.getElementById('current-streak-stats');
    const longestStreakStatsEl = document.getElementById('longest-streak-stats');
    
    if (currentStreakStatsEl) {
        currentStreakStatsEl.textContent = currentStreak;
    }
    if (longestStreakStatsEl) {
        longestStreakStatsEl.textContent = longestStreak;
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
            const book = new Book(data.id, data.name, data.author, data.type, data.total, data.category || 'mama', data.coverUrl || '');
            book.logs = data.logs || [];
            book.completed = data.completed || false;
            book.status = data.status || (book.completed ? 'completed' : 'planned');
            book.updateStatus();
            return book;
        });
    }
}

// Save hidden suggestions to localStorage
function saveHiddenSuggestions() {
    localStorage.setItem('hiddenSuggestions', JSON.stringify(hiddenSuggestions));
}

// Load hidden suggestions from localStorage
function loadHiddenSuggestions() {
    const saved = localStorage.getItem('hiddenSuggestions');
    if (saved) {
        hiddenSuggestions = JSON.parse(saved);
    }
}

// Hide suggestion from autocomplete
function hideSuggestion(type, value) {
    if (type === 'name' && !hiddenSuggestions.names.includes(value)) {
        hiddenSuggestions.names.push(value);
    } else if (type === 'author' && !hiddenSuggestions.authors.includes(value)) {
        hiddenSuggestions.authors.push(value);
    }
    saveHiddenSuggestions();
    updateAutocomplete();
}

// Show suggestion in autocomplete
function showSuggestion(type, value) {
    if (type === 'name') {
        hiddenSuggestions.names = hiddenSuggestions.names.filter(n => n !== value);
    } else if (type === 'author') {
        hiddenSuggestions.authors = hiddenSuggestions.authors.filter(a => a !== value);
    }
    saveHiddenSuggestions();
    updateAutocomplete();
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
    const completedCountBadge = document.getElementById('completed-count');
    
    const completedBooks = books.filter(book => book.completed)
        .sort(naturalSort);
    
    // Update count badge
    if (completedCountBadge) {
        completedCountBadge.textContent = completedBooks.length > 0 ? `(${completedBooks.length})` : '';
    }
    
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

// Filter books by category
function filterBooksByCategory(category) {
    const categorySections = document.querySelectorAll('.category-section');
    const typeSections = document.querySelectorAll('.type-section');
    const bookCards = document.querySelectorAll('#books-list .book-card');
    
    // Hide all first
    categorySections.forEach(section => section.style.display = 'none');
    typeSections.forEach(section => section.style.display = 'none');
    bookCards.forEach(card => card.style.display = 'none');
    
    // Show only selected category
    let shouldShowBooks = false;
    const allElements = document.querySelectorAll('#books-list > *');
    
    allElements.forEach(element => {
        if (element.classList.contains('category-section')) {
            const title = element.querySelector('.category-title').textContent;
            if ((category === 'mama' && title.includes('Мама')) || 
                (category === 'yavor' && title.includes('Явор')) ||
                (category === 'choice' && title.includes('По желание'))) {
                element.style.display = 'block';
                shouldShowBooks = true;
            } else {
                element.style.display = 'none';
                shouldShowBooks = false;
            }
        } else if (element.classList.contains('type-section') && shouldShowBooks) {
            element.style.display = 'block';
        } else if (element.classList.contains('book-card') && shouldShowBooks) {
            element.style.display = 'block';
        }
    });
}

// Render statistics
function renderStatistics() {
    // Update streak display in statistics tab
    const statCurrentStreak = document.getElementById('stat-current-streak');
    if (statCurrentStreak) statCurrentStreak.textContent = currentStreak;
    
    // Update statistics
    const statTotalBooks = document.getElementById('stat-total-books');
    const statCompletedBooks = document.getElementById('stat-completed-books');
    const statTotalPages = document.getElementById('stat-total-pages');
    const statTotalAudio = document.getElementById('stat-total-audio');
    
    // Calculate total pages read from paper books
    const totalPagesRead = books
        .filter(b => b.type === 'paper')
        .reduce((sum, book) => sum + book.getTotalProgress(), 0);
    
    // Calculate total audio time listened (in minutes)
    const totalAudioMinutes = books
        .filter(b => b.type === 'audio')
        .reduce((sum, book) => sum + book.getTotalProgress(), 0);
    
    const audioHours = Math.floor(totalAudioMinutes / 60);
    const audioMins = totalAudioMinutes % 60;
    const audioTimeStr = audioMins > 0 ? `${audioHours}ч ${audioMins}м` : `${audioHours}ч`;
    
    if (statTotalBooks) statTotalBooks.textContent = books.length;
    if (statCompletedBooks) statCompletedBooks.textContent = books.filter(b => b.completed).length;
    if (statTotalPages) statTotalPages.textContent = totalPagesRead;
    if (statTotalAudio) statTotalAudio.textContent = audioTimeStr;
}

// ========================
// AUTOCOMPLETE
// ========================

function updateAutocomplete() {
    // Sort books by most recent first (higher id = more recent)
    const sortedBooks = [...books].sort((a, b) => b.id - a.id);
    
    // Get unique book names and authors (preserving order - most recent first)
    const bookNames = [];
    const authors = [];
    const seenNames = new Set();
    const seenAuthors = new Set();
    
    sortedBooks.forEach(book => {
        if (!seenNames.has(book.name) && !hiddenSuggestions.names.includes(book.name)) {
            bookNames.push(book.name);
            seenNames.add(book.name);
        }
        if (!seenAuthors.has(book.author) && !hiddenSuggestions.authors.includes(book.author)) {
            authors.push(book.author);
            seenAuthors.add(book.author);
        }
    });
    
    // Update book names datalist with delete buttons
    const bookNamesList = document.getElementById('book-names-list');
    if (bookNamesList) {
        bookNamesList.innerHTML = bookNames.map(name => 
            `<option value="${name}">`
        ).join('');
    }
    
    // Update authors datalist
    const authorsList = document.getElementById('authors-list');
    if (authorsList) {
        authorsList.innerHTML = authors.map(author => 
            `<option value="${author}">`
        ).join('');
    }
}

// Open suggestions manager modal
function openSuggestionsManager(type) {
    const modal = document.getElementById('suggestions-modal');
    const title = document.getElementById('suggestions-modal-title');
    const list = document.getElementById('suggestions-list');
    
    title.textContent = type === 'name' ? 'Управление на имена на книги' : 'Управление на автори';
    
    // Get all unique suggestions
    const allSuggestions = [...new Set(books.map(b => type === 'name' ? b.name : b.author))].sort();
    const hidden = type === 'name' ? hiddenSuggestions.names : hiddenSuggestions.authors;
    
    list.innerHTML = allSuggestions.map(suggestion => {
        const isHidden = hidden.includes(suggestion);
        return `
            <div class="suggestion-item">
                <span>${suggestion}</span>
                <button class="btn-small ${isHidden ? 'btn-show' : 'btn-hide'}" 
                        onclick="${isHidden ? 'showSuggestion' : 'hideSuggestion'}('${type}', '${suggestion.replace(/'/g, "\\'")}'); openSuggestionsManager('${type}')">
                    ${isHidden ? '👁️ Покажи' : '🚫 Скрий'}
                </button>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'flex';
}

// Close suggestions manager modal
function closeSuggestionsManager() {
    document.getElementById('suggestions-modal').style.display = 'none';
}

// ========================
// THEME MANAGEMENT
// ========================

function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        theme = saved;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) themeToggle.textContent = '☀️';
        }
    }
}

// ========================
// ACTIVITY FEED
// ========================

function addActivity(type, message, bookName = '') {
    const activity = {
        type,
        message,
        bookName,
        date: new Date().toISOString()
    };
    activityFeed.unshift(activity);
    if (activityFeed.length > 50) activityFeed.pop(); // Keep last 50
    saveActivityFeed();
    renderActivityFeed();
}

function renderActivityFeed() {
    const list = document.getElementById('activity-list');
    if (!list) return;
    
    if (activityFeed.length === 0) {
        list.innerHTML = '<div class="empty-state">Все още няма активност</div>';
        return;
    }
    
    list.innerHTML = activityFeed.map(activity => `
        <div class="activity-item">
            <div class="activity-type">${getActivityIcon(activity.type)} ${activity.type}</div>
            <div class="activity-message">${activity.message}</div>
            <div class="activity-date">${formatDate(activity.date)}</div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'Добавяне': '📚',
        'Прогрес': '📖',
        'Завършване': '✅',
        'Изтриване': '🗑️'
    };
    return icons[type] || '📝';
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Току-що';
    if (minutes < 60) return `Преди ${minutes} мин`;
    if (hours < 24) return `Преди ${hours} ч`;
    if (days < 7) return `Преди ${days} дни`;
    return date.toLocaleDateString('bg-BG');
}

function saveActivityFeed() {
    localStorage.setItem('activityFeed', JSON.stringify(activityFeed));
}

function loadActivityFeed() {
    const saved = localStorage.getItem('activityFeed');
    if (saved) {
        activityFeed = JSON.parse(saved);
    }
}

// ========================
// ACHIEVEMENTS
// ========================

const achievementsList = [
    { id: 'first-book', icon: '📚', name: 'Първа книга', desc: 'Добави първата си книга', check: () => books.length >= 1 },
    { id: 'five-books', icon: '📖', name: '5 книги', desc: 'Добави 5 книги', check: () => books.length >= 5 },
    { id: 'first-complete', icon: '✅', name: 'Първо завършване', desc: 'Завърши първата си книга', check: () => books.some(b => b.completed) },
    { id: 'five-complete', icon: '🏆', name: '5 завършени', desc: 'Завърши 5 книги', check: () => books.filter(b => b.completed).length >= 5 },
    { id: 'streak-7', icon: '🔥', name: '7 дни серия', desc: 'Поддържай 7 дневна серия', check: () => currentStreak >= 7 },
    { id: 'streak-30', icon: '⭐', name: '30 дни серия', desc: 'Поддържай 30 дневна серия', check: () => currentStreak >= 30 },
];

function initializeAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        achievements = JSON.parse(saved);
    } else {
        achievements = achievementsList.map(a => ({ id: a.id, unlocked: false }));
    }
    checkAchievements();
}

function checkAchievements() {
    let updated = false;
    achievementsList.forEach(achievement => {
        const userAch = achievements.find(a => a.id === achievement.id);
        if (userAch && !userAch.unlocked && achievement.check()) {
            userAch.unlocked = true;
            updated = true;
            addActivity('Постижение', `Отключено: ${achievement.name}`, '');
        }
    });
    if (updated) {
        saveAchievements();
        renderAchievements();
    }
}

function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    
    grid.innerHTML = achievementsList.map(achievement => {
        const userAch = achievements.find(a => a.id === achievement.id);
        const unlocked = userAch ? userAch.unlocked : false;
        return `
            <div class="achievement-card ${unlocked ? '' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
        `;
    }).join('');
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function loadAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        achievements = JSON.parse(saved);
    }
}

// ========================
// EDIT BOOK FUNCTIONALITY
// ========================

const editModal = document.getElementById('edit-modal');
const editBookForm = document.getElementById('edit-book-form');
const editPaperFields = document.getElementById('edit-paper-fields');
const editAudioFields = document.getElementById('edit-audio-fields');

function openEditModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('edit-book-id').value = bookId;
    document.getElementById('edit-book-name').value = book.name;
    document.getElementById('edit-book-author').value = book.author;
    document.getElementById('edit-book-cover').value = book.coverUrl || '';
    
    // Set category
    const categoryRadios = document.querySelectorAll('input[name="edit-book-category"]');
    categoryRadios.forEach(radio => {
        radio.checked = radio.value === book.category;
    });
    
    // Set type
    const typeRadios = document.querySelectorAll('input[name="edit-book-type"]');
    typeRadios.forEach(radio => {
        radio.checked = radio.value === book.type;
    });
    
    // Set fields based on type
    if (book.type === 'paper') {
        editPaperFields.style.display = 'block';
        editAudioFields.style.display = 'none';
        document.getElementById('edit-total-pages').value = book.total;
    } else {
        editPaperFields.style.display = 'none';
        editAudioFields.style.display = 'block';
        const hours = Math.floor(book.total / 60);
        const minutes = book.total % 60;
        document.getElementById('edit-total-hours').value = hours;
        document.getElementById('edit-total-minutes').value = minutes;
    }
    
    // Show cover preview
    showCoverPreview('edit-cover-preview', book.coverUrl);
    
    editModal.style.display = 'block';
}

function handleEditBook(e) {
    e.preventDefault();
    
    const bookId = document.getElementById('edit-book-id').value;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    book.name = document.getElementById('edit-book-name').value.trim();
    book.author = document.getElementById('edit-book-author').value.trim();
    book.category = document.querySelector('input[name="edit-book-category"]:checked').value;
    book.type = document.querySelector('input[name="edit-book-type"]:checked').value;
    book.coverUrl = document.getElementById('edit-book-cover').value.trim();
    
    if (book.type === 'paper') {
        book.total = parseInt(document.getElementById('edit-total-pages').value) || 0;
    } else {
        const hours = parseInt(document.getElementById('edit-total-hours').value) || 0;
        const minutes = parseInt(document.getElementById('edit-total-minutes').value) || 0;
        book.total = hours * 60 + minutes;
    }
    
    book.updateStatus();
    saveBooks();
    renderBooks();
    renderStatistics();
    renderCharts();
    editModal.style.display = 'none';
    addActivity('Редактиране', `Редактирана книга "${book.name}"`, book.name);
}

function showCoverPreview(previewId, url) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Cover preview" onerror="this.parentElement.innerHTML='<div class=\\'cover-error\\'>Невалиден URL</div>'">`;
        preview.style.display = 'block';
    } else {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
}

// ========================
// EXPORT/IMPORT FUNCTIONALITY
// ========================

function exportData() {
    const data = {
        books: books,
        streaks: { currentStreak, longestStreak },
        activityFeed: activityFeed,
        achievements: achievements,
        dailyGoal: dailyGoal,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `book-tracking-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    addActivity('Експорт', 'Данните са експортирани', '');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('Сигурни ли сте, че искате да импортирате данни? Това ще замести текущите данни.')) {
                // Restore books
                if (data.books) {
                    books = data.books.map(bookData => {
                        const book = new Book(
                            bookData.id,
                            bookData.name,
                            bookData.author,
                            bookData.type,
                            bookData.total,
                            bookData.category || 'mama',
                            bookData.coverUrl || ''
                        );
                        book.logs = bookData.logs || [];
                        book.completed = bookData.completed || false;
                        book.status = bookData.status || 'planned';
                        return book;
                    });
                    saveBooks();
                }
                
                // Restore streaks
                if (data.streaks) {
                    currentStreak = data.streaks.currentStreak || 0;
                    longestStreak = data.streaks.longestStreak || 0;
                    saveStreaks();
                }
                
                // Restore activity feed
                if (data.activityFeed) {
                    activityFeed = data.activityFeed;
                    saveActivityFeed();
                }
                
                // Restore achievements
                if (data.achievements) {
                    achievements = data.achievements;
                    saveAchievements();
                }
                
                // Restore daily goal
                if (data.dailyGoal) {
                    dailyGoal = data.dailyGoal;
                }
                
                // Re-render everything
                renderBooks();
                renderStreakDisplay();
                renderStatistics();
                renderActivityFeed();
                renderAchievements();
                renderCharts();
                
                addActivity('Импорт', 'Данните са импортирани успешно', '');
                alert('Данните са импортирани успешно!');
            }
        } catch (error) {
            alert('Грешка при импортиране на данни: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// ========================
// CHARTS FUNCTIONALITY
// ========================

let progressChart = null;
let categoryChart = null;

function renderCharts() {
    renderProgressChart();
    renderCategoryChart();
}

function renderProgressChart() {
    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (progressChart) {
        progressChart.destroy();
    }
    
    // Get progress data over last 30 days
    const days = 30;
    const today = new Date();
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        labels.push(date.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' }));
        
        // Calculate total progress for this day
        let dayProgress = 0;
        books.forEach(book => {
            const dayLogs = book.logs.filter(log => log.date === dateStr);
            dayProgress += dayLogs.reduce((sum, log) => sum + log.amount, 0);
        });
        
        data.push(dayProgress);
    }
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Прочетени страници/минути',
                data: data,
                borderColor: '#52b788',
                backgroundColor: 'rgba(82, 183, 136, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Прогрес през последните 30 дни'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Count books by category and status
    const mamaTotal = books.filter(b => b.category === 'mama').length;
    const yavorTotal = books.filter(b => b.category === 'yavor').length;
    const mamaCompleted = books.filter(b => b.category === 'mama' && b.completed).length;
    const yavorCompleted = books.filter(b => b.category === 'yavor' && b.completed).length;
    
    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Уговорка с Мама', 'Уговорка с Явор'],
            datasets: [
                {
                    label: 'Завършени',
                    data: [mamaCompleted, yavorCompleted],
                    backgroundColor: '#28a745'
                },
                {
                    label: 'В процес',
                    data: [mamaTotal - mamaCompleted, yavorTotal - yavorCompleted],
                    backgroundColor: '#ffc107'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Книги по категория'
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}