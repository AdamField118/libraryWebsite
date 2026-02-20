// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const closeBtn = document.getElementById('closeBtn');
// const sortNewestBtn = document.getElementById('sort-newest');
// const sortOldestBtn = document.getElementById('sort-oldest');
const loadingIndicator = document.getElementById('loadingIndicator');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const resultCount = document.getElementById('result-count');

let allPosts = [];
let searchQuery = '';

// ANIMATION-ONLY FUNCTIONS
function animateCardsIn(cards, staggerDelay = 100) {
    cards.forEach((card, index) => {
        card.classList.remove('card-visible');
        card.classList.add('card-hidden');
        
        setTimeout(() => {
            card.classList.remove('card-hidden');
            card.classList.add('card-visible');
        }, index * staggerDelay);
    });
}

function animateCardsOut(cards, callback) {
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.remove('card-visible');
            card.classList.add('card-hidden');
        }, index * 50);
    });
    
    setTimeout(callback, cards.length * 50 + 300);
}
// END ANIMATION-ONLY FUNCTIONS

// ── books use year not date, but keep the same helpers ──
function parseDate(yearString) {
    return new Date(parseInt(yearString), 0, 1);
}

function formatDate(yearString) {
    return yearString;
}

// ── load from JSON instead of markdown files ────────────
async function loadBooks() {
    loadingIndicator.style.display = 'block';

    const resp = await fetch('../data/books.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    loadingIndicator.style.display = 'none';

    return data.books.map(b => ({
        title:       b.title,
        date:        String(b.year),       // reuse "date" field as year string
        tags:        b.subjects,
        snippet:     b.author.split(';')[0].trim(),
        // book-specific fields passed through for the detail view
        author:      b.author,
        isbn:        b.isbn,
        publisher:   b.publisher,
        edition:     b.edition,
        description: b.description
    }));
}

// ── wire search and sort to sidebar ─────────────────────
function bindSidebar() {
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = searchInput.value.trim().toLowerCase();
            applyFilters();
        }, 400);
    });

    sortSelect.addEventListener('change', () => {
        applyFilters();
    });
}

// ── filter/search/sort then re-render ───────────────────
function applyFilters() {
    let books = allPosts.slice();

    if (searchQuery) {
        books = books.filter(b => {
            const hay = [b.title, b.author, b.isbn, b.publisher, b.description, ...b.tags]
                .join(' ').toLowerCase();
            return hay.includes(searchQuery);
        });
    }

    const sortVal = sortSelect.value;
    books.sort((a, b) => {
        switch (sortVal) {
            case 'title-asc':  return a.title.localeCompare(b.title);
            case 'title-desc': return b.title.localeCompare(a.title);
            case 'author-asc':
                return a.snippet.split(',')[0].localeCompare(b.snippet.split(',')[0]);
            case 'year-desc':  return parseInt(b.date) - parseInt(a.date);
            case 'year-asc':   return parseInt(a.date) - parseInt(b.date);
            default:           return 0;
        }
    });

    const total = `${books.length} book${books.length !== 1 ? 's' : ''}`;
    resultCount.textContent = searchQuery
        ? `${total} found`
        : `${total} in collection`;

    renderPosts(books);
}

// renderPosts — unchanged from blog.js (animation wrapper)
function renderPosts(posts) {
    const existingCards = Array.from(postsContainer.querySelectorAll('.card'));
    const shouldAnimate = existingCards.length > 0;
    
    if (shouldAnimate) {
        animateCardsOut(existingCards, () => {
            renderPostsOriginal(posts);
            const newCards = Array.from(postsContainer.querySelectorAll('.card'));
            setTimeout(() => animateCardsIn(newCards, 100), 50);
        });
    } else {
        renderPostsOriginal(posts);
        const newCards = Array.from(postsContainer.querySelectorAll('.card'));
        setTimeout(() => animateCardsIn(newCards, 100), 50);
    }
}

// ── renderPostsOriginal adapted for book fields ─────────
// Structure is identical to blog.js — same classes, same DOM shape.
function renderPostsOriginal(posts) {
    postsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postsContainer.innerHTML = '<div class="error">No books match your search.</div>';
        return;
    }
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'card';
        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-title">${post.title}</div>
                <div class="post-date">${formatDate(post.date)}</div>
            </div>
            <div class="post-snippet">
                ${post.snippet}
            </div>
            <div class="post-footer">
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="read-more">Click to read →</div>
            </div>
        `;
        
        postElement.addEventListener('click', () => {
            showFullPost(post);
        });
        
        postsContainer.appendChild(postElement);
    });
}

// ── showFullPost renders book detail instead of markdown ─
// Everything outside post-full-body is identical to blog.js.
function showFullPost(post) {
    const postFull = document.createElement('div');
    postFull.className = 'post-full';
    postFull.id = 'postFull';

    const editionStr = ordinal(post.edition);
    const isbnFmt = formatISBN(post.isbn);
    const authorsDisplay = post.author.replace(/;/g, ' · ');

    postFull.innerHTML = `
        <div class="post-full-content">
            <div class="post-full-header">
                <h1 class="post-full-title">${post.title}</h1>
                <div class="post-full-meta">
                    <span><i class="far fa-user"></i> ${authorsDisplay}</span>
                    <span><i class="far fa-calendar"></i> ${post.date}</span>
                    <span><i class="far fa-building"></i> ${post.publisher}</span>
                </div>
            </div>
            <div class="post-full-body">
                <table class="book-meta-table">
                    <tr><td>Author(s)</td><td>${authorsDisplay}</td></tr>
                    <tr><td>Publisher</td><td>${post.publisher}</td></tr>
                    <tr><td>Year</td><td>${post.date}</td></tr>
                    <tr><td>Edition</td><td>${editionStr}</td></tr>
                    <tr><td>ISBN-13</td><td style="font-family:'Courier New',monospace; font-size:0.85rem; color:#555;">${isbnFmt}</td></tr>
                    <tr>
                        <td>Subjects</td>
                        <td>
                            <div class="post-tags" style="margin:0;">
                                ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                            </div>
                        </td>
                    </tr>
                </table>

                <h2>About this book</h2>
                <p>${post.description}</p>

                <div class="book-detail-links">
                    <a href="https://www.worldcat.org/isbn/${post.isbn}" target="_blank" rel="noopener">
                        <i class="fas fa-search"></i> Find in WorldCat
                    </a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(post.title + ' ' + post.snippet)}+book" target="_blank" rel="noopener">
                        <i class="fab fa-google"></i> Google Books
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(postFull);
    closeBtn.classList.add('visible');
    
    setTimeout(() => {
        postFull.classList.add('active');
    }, 10);
    
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscapeKey);
}

// closeFullPost — unchanged from blog.js
function closeFullPost() {
    const postFull = document.getElementById('postFull');
    if (postFull) {
        postFull.classList.remove('active');
        setTimeout(() => postFull.remove(), 300);
    }
    closeBtn.classList.remove('visible');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEscapeKey);
}

// handleEscapeKey — unchanged from blog.js
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        closeFullPost();
    }
}

// sortNewestFirst — unchanged from blog.js
function sortNewestFirst(posts) {
    return [...posts].sort((a, b) => {
        const dateComparison = parseDate(b.date) - parseDate(a.date);
        if (dateComparison === 0) {
            return a.title.localeCompare(b.title);
        }
        return dateComparison;
    });
}

// sortOldestFirst — unchanged from blog.js
function sortOldestFirst(posts) {
    return [...posts].sort((a, b) => {
        const dateComparison = parseDate(a.date) - parseDate(b.date);
        if (dateComparison === 0) {
            return a.title.localeCompare(b.title);
        }
        return dateComparison;
    });
}

// closeBtn / sort button listeners — unchanged from blog.js
closeBtn.addEventListener('click', closeFullPost);

// sortNewestBtn.addEventListener('click', () => {
//     const sortedPosts = sortNewestFirst(allPosts);
//     renderPosts(sortedPosts);
//     sortNewestBtn.classList.add('active');
//     sortOldestBtn.classList.remove('active');
// });

// sortOldestBtn.addEventListener('click', () => {
//     const sortedPosts = sortOldestFirst(allPosts);
//     renderPosts(sortedPosts);
//     sortOldestBtn.classList.add('active');
//     sortNewestBtn.classList.remove('active');
// });

// ── boot — load JSON, build filters, initial render ─────
loadBooks().then(books => {
    allPosts = books;
    bindSidebar();
    resultCount.textContent = `${books.length} books in collection`;
    const sorted = sortNewestFirst(allPosts);
    renderPosts(sorted);
}).catch(error => {
    console.error('Error loading books:', error);
    loadingIndicator.innerHTML = `<div class="error">Error loading library: ${error.message}</div>`;
});

// ── Helpers ──────────────────────────────────────────────────────
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatISBN(isbn) {
    if (String(isbn).length === 13) {
        return `${isbn.slice(0,3)}-${isbn.slice(3,4)}-${isbn.slice(4,7)}-${isbn.slice(7,12)}-${isbn.slice(12)}`;
    }
    return isbn;
}