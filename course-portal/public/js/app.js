/* ============================================================
   EduRate — Main Application JS
   Full-Stack Course Rating & Feedback Portal
   ============================================================ */

'use strict';

// ─── State ───────────────────────────────────────────────────
const API = '/api';
let currentUser = null;
let currentPage = 'home';
let currentCourseId = null;
let currentInstructorId = null;
let coursePage = 1;
let totalCoursePages = 1;
let ratings = { overall: 0, content: 0, clarity: 0, material: 0, assess: 0 };

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  navigate('home');
  initNavbarScroll();
  initCharCounter();
  loadHeroStats();
  loadDeptGrid();
});

// ─── Navigation ───────────────────────────────────────────────
function navigate(page, id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  currentPage = page;

  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (page) {
    case 'home':        loadFeaturedCourses(); break;
    case 'courses':     loadCourses(1); break;
    case 'leaderboard': loadLeaderboard(); break;
    case 'instructors': loadInstructors(); break;
    case 'dashboard':
      if (!currentUser) { openModal('loginModal'); return; }
      loadDashboard(); break;
    case 'admin':
      if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
      loadAdmin(); break;
    case 'course-detail':
      if (id) { currentCourseId = id; loadCourseDetail(id); }
      break;
    case 'instructor-detail':
      if (id) { currentInstructorId = id; loadInstructorDetail(id); }
      break;
  }
}

// ─── API Helper ───────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = localStorage.getItem('token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────
function restoreSession() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    currentUser = JSON.parse(user);
    updateNavForUser();
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Please fill in all fields', 'warning'); return; }

  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  try {
    const data = await apiFetch('/auth/login', 'POST', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavForUser();
    closeModal('loginModal');
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
    if (data.user.role === 'admin') navigate('admin');
    else navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const department = document.getElementById('regDept').value.trim();
  if (!name || !email || !password) { showToast('Please fill in all required fields', 'warning'); return; }

  try {
    const data = await apiFetch('/auth/register', 'POST', { name, email, password, role, department });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavForUser();
    closeModal('registerModal');
    showToast(`Account created! Welcome, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
    navigate('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateNavForUser();
  navigate('home');
  showToast('Logged out successfully', 'success');
}

function updateNavForUser() {
  const guestEl = document.getElementById('nav-guest');
  const userEl = document.getElementById('nav-user');
  const dashNav = document.getElementById('nav-dashboard');
  const adminNav = document.getElementById('nav-admin');

  if (currentUser) {
    guestEl.style.display = 'none';
    userEl.style.display = 'flex';
    document.getElementById('nav-user-name').textContent = currentUser.name.split(' ')[0];
    document.getElementById('navAvatar').textContent = currentUser.name[0].toUpperCase();
    dashNav.style.display = 'inline-flex';
    adminNav.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
  } else {
    guestEl.style.display = 'flex';
    userEl.style.display = 'none';
    dashNav.style.display = 'none';
    adminNav.style.display = 'none';
  }
}

// ─── HOME ─────────────────────────────────────────────────────
async function loadFeaturedCourses() {
  try {
    const data = await apiFetch('/courses?sort=rating&limit=6');
    const grid = document.getElementById('featuredCourses');
    if (!data.courses || data.courses.length === 0) {
      grid.innerHTML = buildEmptyState('No courses yet', 'Seed the database to see featured courses.');
      return;
    }
    grid.innerHTML = data.courses.map(c => buildCourseCard(c)).join('');
  } catch (err) {
    // Show demo courses when API is down
    document.getElementById('featuredCourses').innerHTML = buildDemoCourses();
  }
}

function buildDemoCourses() {
  const demos = [
    { _id:'1', title:'Machine Learning Fundamentals', code:'CS501', department:'Computer Science', category:'Engineering', averageRating:4.8, totalRatings:127, semester:'Fall', year:2024, instructor:{name:'Prof. Sarah Mitchell'}, tags:['ML','Python'] },
    { _id:'2', title:'Full Stack Web Development', code:'CS305', department:'Computer Science', category:'Engineering', averageRating:4.7, totalRatings:98, semester:'Fall', year:2024, instructor:{name:'Prof. Emily Chen'}, tags:['React','Node.js'] },
    { _id:'3', title:'Advanced Calculus & Analysis', code:'MATH401', department:'Mathematics', category:'Mathematics', averageRating:4.5, totalRatings:64, semester:'Spring', year:2024, instructor:{name:'Dr. James Patel'}, tags:['Calculus','Analysis'] },
    { _id:'4', title:'Data Structures & Algorithms', code:'CS201', department:'Computer Science', category:'Engineering', averageRating:4.9, totalRatings:185, semester:'Fall', year:2024, instructor:{name:'Prof. Sarah Mitchell'}, tags:['DSA','Algorithms'] },
    { _id:'5', title:'Business Analytics & Strategy', code:'BUS301', department:'Business', category:'Business', averageRating:4.4, totalRatings:52, semester:'Spring', year:2024, instructor:{name:'Dr. Robert Kim'}, tags:['Analytics','Strategy'] },
    { _id:'6', title:'Cloud Computing & DevOps', code:'CS410', department:'Computer Science', category:'Engineering', averageRating:4.6, totalRatings:73, semester:'Fall', year:2024, instructor:{name:'Prof. Emily Chen'}, tags:['AWS','Docker'] }
  ];
  return demos.map(c => buildCourseCard(c)).join('');
}

async function loadHeroStats() {
  try {
    const data = await apiFetch('/courses/stats/summary');
    if (data.stats) {
      document.querySelector('[data-target="250"]').setAttribute('data-target', data.stats.totalCourses);
      document.querySelector('[data-target="45"]').setAttribute('data-target', data.stats.departments?.length || 45);
    }
  } catch {}
  animateCounters();
}

function animateCounters() {
  document.querySelectorAll('.hero-stat .num').forEach(el => {
    const target = parseInt(el.getAttribute('data-target')) || 0;
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current).toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

async function loadDeptGrid() {
  const depts = [
    { name: 'Computer Science', icon: '💻', courses: 48 },
    { name: 'Mathematics', icon: '📐', courses: 32 },
    { name: 'Engineering', icon: '⚙️', courses: 55 },
    { name: 'Business', icon: '📊', courses: 41 },
    { name: 'Medicine', icon: '🏥', courses: 38 },
    { name: 'Arts & Humanities', icon: '🎨', courses: 29 },
    { name: 'Law', icon: '⚖️', courses: 22 },
    { name: 'Sciences', icon: '🔬', courses: 44 }
  ];
  const grid = document.getElementById('deptGrid');
  if (grid) {
    grid.innerHTML = depts.map(d => `
      <div onclick="filterByDept('${d.name}')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px;text-align:center;cursor:pointer;transition:all .25s;backdrop-filter:blur(10px)"
        onmouseover="this.style.background='rgba(255,255,255,.1)';this.style.transform='translateY(-4px)'"
        onmouseout="this.style.background='rgba(255,255,255,.05)';this.style.transform='translateY(0)'">
        <div style="font-size:2rem;margin-bottom:10px">${d.icon}</div>
        <div style="color:white;font-weight:700;font-size:.88rem;margin-bottom:4px">${d.name}</div>
        <div style="color:rgba(255,255,255,.4);font-size:.75rem">${d.courses} courses</div>
      </div>
    `).join('');
  }
}

function filterByDept(dept) {
  navigate('courses');
  setTimeout(() => {
    document.getElementById('filterDept').value = dept;
    loadCourses(1);
  }, 100);
}

// ─── COURSES ──────────────────────────────────────────────────
async function loadCourses(page = 1) {
  coursePage = page;
  const search = document.getElementById('courseSearch')?.value || '';
  const dept = document.getElementById('filterDept')?.value || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const semester = document.getElementById('filterSemester')?.value || '';
  const sort = document.getElementById('filterSort')?.value || 'rating';

  const params = new URLSearchParams({ page, limit: 9, sort });
  if (search) params.append('search', search);
  if (dept) params.append('department', dept);
  if (category) params.append('category', category);
  if (semester) params.append('semester', semester);

  const grid = document.getElementById('coursesGrid');
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;

  try {
    const data = await apiFetch(`/courses?${params}`);
    totalCoursePages = data.pages || 1;
    document.getElementById('courseCount').textContent = `${data.total} courses found`;

    if (!data.courses || data.courses.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1">${buildEmptyState('No courses found', 'Try adjusting your filters or search term.')}</div>`;
    } else {
      grid.innerHTML = data.courses.map(c => buildCourseCard(c)).join('');
    }
    buildPagination();
  } catch (err) {
    // Fallback demo data
    const demos = getDemoCourses();
    grid.innerHTML = demos.map(c => buildCourseCard(c)).join('');
    document.getElementById('courseCount').textContent = `${demos.length} demo courses`;
    totalCoursePages = 1;
    buildPagination();
  }
}

function getDemoCourses() {
  return [
    { _id:'1', title:'Machine Learning Fundamentals', code:'CS501', department:'Computer Science', category:'Engineering', averageRating:4.8, totalRatings:127, semester:'Fall', year:2024, instructor:{name:'Prof. Sarah Mitchell'}, tags:['ML','Python','AI'] },
    { _id:'2', title:'Full Stack Web Development', code:'CS305', department:'Computer Science', category:'Engineering', averageRating:4.7, totalRatings:98, semester:'Fall', year:2024, instructor:{name:'Prof. Emily Chen'}, tags:['React','Node.js','MongoDB'] },
    { _id:'3', title:'Advanced Calculus & Analysis', code:'MATH401', department:'Mathematics', category:'Mathematics', averageRating:4.5, totalRatings:64, semester:'Spring', year:2024, instructor:{name:'Dr. James Patel'}, tags:['Calculus','Analysis'] },
    { _id:'4', title:'Data Structures & Algorithms', code:'CS201', department:'Computer Science', category:'Engineering', averageRating:4.9, totalRatings:185, semester:'Fall', year:2024, instructor:{name:'Prof. Sarah Mitchell'}, tags:['DSA','Algorithms','Python'] },
    { _id:'5', title:'Business Analytics & Strategy', code:'BUS301', department:'Business', category:'Business', averageRating:4.4, totalRatings:52, semester:'Spring', year:2024, instructor:{name:'Dr. Robert Kim'}, tags:['Analytics','Strategy'] },
    { _id:'6', title:'Cloud Computing & DevOps', code:'CS410', department:'Computer Science', category:'Engineering', averageRating:4.6, totalRatings:73, semester:'Fall', year:2024, instructor:{name:'Prof. Emily Chen'}, tags:['AWS','Docker','DevOps'] },
    { _id:'7', title:'Statistical Methods in Research', code:'MATH305', department:'Mathematics', category:'Mathematics', averageRating:4.3, totalRatings:41, semester:'Spring', year:2024, instructor:{name:'Dr. James Patel'}, tags:['Statistics','Research'] },
    { _id:'8', title:'Project Management Professional', code:'BUS401', department:'Business', category:'Business', averageRating:4.5, totalRatings:67, semester:'Spring', year:2024, instructor:{name:'Dr. Robert Kim'}, tags:['PMP','Agile','Scrum'] },
    { _id:'9', title:'Database Design & SQL', code:'CS302', department:'Computer Science', category:'Engineering', averageRating:4.2, totalRatings:88, semester:'Fall', year:2024, instructor:{name:'Prof. Emily Chen'}, tags:['SQL','Database','MySQL'] }
  ];
}

function buildCourseCard(c) {
  const catClass = {
    'Engineering': 'badge-engineering', 'Mathematics': 'badge-mathematics',
    'Business': 'badge-business', 'Science': 'badge-science'
  }[c.category] || 'badge-default';

  const catIcon = {
    'Engineering': '💻', 'Mathematics': '📐', 'Business': '📊', 'Science': '🔬',
    'Arts': '🎨', 'Medicine': '🏥', 'Law': '⚖️'
  }[c.category] || '📚';

  const stars = renderStars(c.averageRating);
  const instName = c.instructor?.name || 'Unknown Instructor';
  const instInitial = instName[0];

  return `
    <div class="course-card slide-up" onclick="navigate('course-detail','${c._id}')">
      <div class="course-card-thumb" style="background:${getCourseGradient(c.category)}">
        <div class="thumb-bg">${catIcon}</div>
        <div class="course-card-badge ${catClass}">${c.category || 'Course'}</div>
        ${c.averageRating >= 4.7 ? '<div style="position:absolute;top:12px;left:12px;background:rgba(245,158,11,.9);color:white;border-radius:20px;padding:3px 10px;font-size:.7rem;font-weight:700">⭐ TOP RATED</div>' : ''}
        <div style="font-size:3.5rem;position:relative;z-index:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))">${catIcon}</div>
      </div>
      <div class="course-card-body">
        <div class="course-code">${c.code} · ${c.semester} ${c.year}</div>
        <div class="course-title">${c.title}</div>
        <div class="course-instructor">
          <div class="instructor-avatar-sm">${instInitial}</div>
          ${instName}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${(c.tags || []).slice(0,3).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <div class="course-meta">
          <div class="rating-display">
            <div class="stars">${stars}</div>
            <span class="rating-score">${c.averageRating > 0 ? c.averageRating.toFixed(1) : 'New'}</span>
            <span class="rating-count">(${c.totalRatings || 0})</span>
          </div>
          <span style="font-size:.78rem;color:var(--text-muted)">${c.credits || 3} credits</span>
        </div>
      </div>
    </div>`;
}

function getCourseGradient(cat) {
  const grads = {
    'Engineering': 'linear-gradient(135deg,#1e3a8a,#2563eb)',
    'Mathematics': 'linear-gradient(135deg,#0891b2,#0e7490)',
    'Business': 'linear-gradient(135deg,#92400e,#d97706)',
    'Science': 'linear-gradient(135deg,#065f46,#059669)',
    'Arts': 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'Medicine': 'linear-gradient(135deg,#991b1b,#dc2626)',
    'Law': 'linear-gradient(135deg,#1e1e2e,#374151)'
  };
  return grads[cat] || 'linear-gradient(135deg,#1e3a8a,#0891b2)';
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '★'.repeat(full);
  if (half) stars += '☆';
  stars += '☆'.repeat(5 - full - (half ? 1 : 0));
  return stars;
}

function handleSearchKey(e) {
  if (e.key === 'Enter') loadCourses(1);
}

function buildPagination() {
  const el = document.getElementById('coursesPagination');
  if (!el || totalCoursePages <= 1) { if(el) el.innerHTML = ''; return; }
  let html = '';
  if (coursePage > 1) html += `<button class="page-btn" onclick="loadCourses(${coursePage-1})">‹</button>`;
  for (let i = 1; i <= totalCoursePages; i++) {
    html += `<button class="page-btn ${i===coursePage?'active':''}" onclick="loadCourses(${i})">${i}</button>`;
  }
  if (coursePage < totalCoursePages) html += `<button class="page-btn" onclick="loadCourses(${coursePage+1})">›</button>`;
  el.innerHTML = html;
}

// ─── COURSE DETAIL ───────────────────────────────────────────
async function loadCourseDetail(id) {
  const container = document.getElementById('courseDetailContent');
  container.innerHTML = `<div style="text-align:center;padding:80px"><div class="spinner" style="margin:0 auto"></div></div>`;

  try {
    const [courseData, reviewData] = await Promise.all([
      apiFetch(`/courses/${id}`),
      apiFetch(`/reviews/course/${id}`)
    ]);
    const c = courseData.course;
    const reviews = reviewData.reviews || [];
    const dist = reviewData.distribution || [];

    container.innerHTML = buildCourseDetailHTML(c, reviews, dist);
    animateProgressBars();
  } catch (err) {
    // Demo fallback
    const demo = getDemoCourses().find(c => c._id === id) || getDemoCourses()[0];
    container.innerHTML = buildCourseDetailHTML(demo, getDemoReviews(), getDemoDist());
  }
}

function buildCourseDetailHTML(c, reviews, dist) {
  const catIcon = {'Engineering':'💻','Mathematics':'📐','Business':'📊','Science':'🔬','Arts':'🎨','Medicine':'🏥','Law':'⚖️'}[c.category] || '📚';
  const instName = c.instructor?.name || 'Unknown';

  // Dist map
  const distMap = {};
  dist.forEach(d => { distMap[d._id] = d.count; });
  const totalDist = Object.values(distMap).reduce((a,b)=>a+b, 0);

  const detailRatings = [
    { label: 'Content Quality', val: c.contentQuality || 4.2 },
    { label: 'Instructor Clarity', val: c.instructorClarity || 4.5 },
    { label: 'Course Material', val: c.courseMaterial || 4.0 },
    { label: 'Assessments', val: c.assessment || 3.9 }
  ];

  return `
    <div style="background:${getCourseGradient(c.category)};padding:80px 0 60px;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;font-size:20rem;display:flex;align-items:center;justify-content:center;opacity:.05">${catIcon}</div>
      <div class="container" style="position:relative">
        <div style="display:flex;align-items:flex-start;gap:32px;flex-wrap:wrap">
          <div style="flex:1;min-width:280px">
            <div style="margin-bottom:16px">
              <span style="background:rgba(255,255,255,.15);color:white;padding:4px 14px;border-radius:20px;font-size:.78rem;font-weight:700;text-transform:uppercase">${c.code}</span>
              <span style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.8);padding:4px 14px;border-radius:20px;font-size:.78rem;margin-left:8px">${c.semester || 'Fall'} ${c.year || 2024}</span>
            </div>
            <h1 style="color:white;font-size:2.2rem;margin-bottom:12px;font-weight:900">${c.title}</h1>
            <p style="color:rgba(255,255,255,.75);font-size:1rem;margin-bottom:20px;line-height:1.7;max-width:600px">${c.description || ''}</p>
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;color:white;font-weight:700">${instName[0]}</div>
                <div>
                  <div style="color:white;font-weight:600;font-size:.9rem">${instName}</div>
                  <div style="color:rgba(255,255,255,.55);font-size:.75rem">${c.instructor?.department || c.department || ''}</div>
                </div>
              </div>
              <span style="color:rgba(255,255,255,.5)">|</span>
              <span style="color:rgba(255,255,255,.8);font-size:.88rem">📚 ${c.credits || 3} Credits</span>
              <span style="color:rgba(255,255,255,.8);font-size:.88rem">👥 ${c.enrolledStudents?.length || 0} Students</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
              ${(c.tags||[]).map(t=>`<span class="tag" style="background:rgba(255,255,255,.15);color:rgba(255,255,255,.9);border-color:rgba(255,255,255,.2)">${t}</span>`).join('')}
            </div>
          </div>
          <div style="background:rgba(255,255,255,.1);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:28px;text-align:center;min-width:200px">
            <div style="font-size:4rem;font-weight:900;color:white;line-height:1">${c.averageRating > 0 ? c.averageRating.toFixed(1) : 'N/A'}</div>
            <div style="font-size:1.5rem;color:var(--accent-light);margin:8px 0">${renderStars(c.averageRating||0)}</div>
            <div style="color:rgba(255,255,255,.6);font-size:.82rem">${c.totalRatings || 0} reviews</div>
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-accent" onclick="openReviewModal('${c._id}')">✍️ Write Review</button>
              <button class="btn btn-secondary" style="color:white;border-color:rgba(255,255,255,.4)" onclick="enrollCourse('${c._id}')">+ Enroll</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container" style="padding:48px 24px">
      <div style="display:grid;grid-template-columns:1fr 340px;gap:40px;align-items:start;flex-wrap:wrap">
        
        <!-- Reviews Section -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <h2 style="font-size:1.4rem">Student Reviews</h2>
            <select class="filter-select" onchange="sortReviews(this.value,'${c._id}')">
              <option value="newest">Most Recent</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
          <div id="reviewsList">
            ${reviews.length === 0 
              ? buildEmptyState('No reviews yet', 'Be the first to review this course!')
              : reviews.map(r => buildReviewCard(r)).join('')
            }
          </div>
        </div>

        <!-- Rating Summary Sidebar -->
        <div>
          <div class="card" style="margin-bottom:20px">
            <div class="card-body">
              <h3 style="font-size:1rem;margin-bottom:20px">Rating Breakdown</h3>
              <div class="rating-dist">
                ${[5,4,3,2,1].map(star => {
                  const count = distMap[star] || 0;
                  const pct = totalDist > 0 ? (count/totalDist*100).toFixed(0) : 0;
                  return `<div class="dist-row">
                    <span class="dist-label">${star}</span>
                    <span style="color:var(--accent);font-size:.9rem">★</span>
                    <div class="dist-bar"><div class="dist-fill" style="width:${pct}%"></div></div>
                    <span class="dist-count">${count}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:20px">
            <div class="card-body">
              <h3 style="font-size:1rem;margin-bottom:16px">Detailed Ratings</h3>
              ${detailRatings.map(r => `
                <div style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
                    <span style="color:var(--text-secondary)">${r.label}</span>
                    <span style="font-weight:700;color:var(--primary)">${r.val}/5</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${(r.val/5)*100}%"></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h3 style="font-size:1rem;margin-bottom:12px">Course Info</h3>
              <div style="display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;justify-content:space-between;font-size:.85rem">
                  <span style="color:var(--text-muted)">Department</span>
                  <span style="font-weight:600">${c.department}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.85rem">
                  <span style="color:var(--text-muted)">Credits</span>
                  <span style="font-weight:600">${c.credits || 3}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.85rem">
                  <span style="color:var(--text-muted)">Category</span>
                  <span style="font-weight:600">${c.category}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.85rem">
                  <span style="color:var(--text-muted)">Semester</span>
                  <span style="font-weight:600">${c.semester} ${c.year}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.85rem">
                  <span style="color:var(--text-muted)">Enrolled</span>
                  <span style="font-weight:600">${c.enrolledStudents?.length || 0} students</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function getDemoReviews() {
  return [
    { _id:'r1', student:{name:'Alex Johnson', department:'Computer Science'}, rating:5, title:'Outstanding ML Course!', comment:'Prof. Mitchell explains complex concepts with remarkable clarity. The hands-on projects really solidified my understanding.', pros:'Excellent projects, clear explanations', cons:'Could use more deep learning examples', createdAt: new Date().toISOString(), isAnonymous:false, semester:'Fall', year:2024 },
    { _id:'r2', student:{name:'Maya Williams', department:'Mathematics'}, rating:4, title:'Great Foundation in ML', comment:'Solid course with practical examples. The professor is very knowledgeable and always willing to help.', pros:'Practical focus, supportive instructor', cons:'Assignments are quite challenging', createdAt: new Date(Date.now()-86400000).toISOString(), isAnonymous:false, semester:'Fall', year:2024 },
    { _id:'r3', student:{name:'Anonymous'}, rating:5, title:'Best CS Course Ever', comment:'This course transformed how I think about data and algorithms. Highly recommended for any CS student.', pros:'Comprehensive, well-structured', cons:'Heavy workload', createdAt: new Date(Date.now()-172800000).toISOString(), isAnonymous:true, semester:'Fall', year:2024 }
  ];
}

function getDemoDist() {
  return [{_id:5,count:8},{_id:4,count:3},{_id:3,count:1}];
}

function buildReviewCard(r) {
  const name = r.isAnonymous ? 'Anonymous Student' : (r.student?.name || 'Student');
  const initial = name[0].toUpperCase();
  const dept = r.isAnonymous ? '' : (r.student?.department || '');
  const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `
    <div class="review-card" style="margin-bottom:16px">
      <div class="review-header">
        <div class="reviewer-info">
          <div class="reviewer-avatar" style="${r.isAnonymous?'background:var(--surface-2);color:var(--text-muted)':''}">${r.isAnonymous?'?':initial}</div>
          <div>
            <div class="reviewer-name">${name}</div>
            <div class="reviewer-dept">${dept}${dept&&r.semester?' · ':''} ${r.semester||''} ${r.year||''}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="review-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${date}</div>
        </div>
      </div>
      ${r.title ? `<div class="review-title">${r.title}</div>` : ''}
      <div class="review-comment">${r.comment || ''}</div>
      ${r.pros ? `<div style="margin-top:10px;padding:10px;background:rgba(16,185,129,.05);border-left:3px solid var(--success);border-radius:0 8px 8px 0"><span style="font-size:.75rem;font-weight:700;color:var(--success);text-transform:uppercase;letter-spacing:.05em">✓ Pros</span><p style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">${r.pros}</p></div>` : ''}
      ${r.cons ? `<div style="margin-top:8px;padding:10px;background:rgba(239,68,68,.05);border-left:3px solid var(--danger);border-radius:0 8px 8px 0"><span style="font-size:.75rem;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:.05em">✗ Cons</span><p style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">${r.cons}</p></div>` : ''}
      ${r.isAnonymous ? '<div style="margin-top:10px"><span class="tag">Anonymous</span></div>' : ''}
    </div>`;
}

async function sortReviews(sort, courseId) {
  try {
    const data = await apiFetch(`/reviews/course/${courseId}?sort=${sort}`);
    const el = document.getElementById('reviewsList');
    el.innerHTML = data.reviews.map(r => buildReviewCard(r)).join('');
  } catch {}
}

function animateProgressBars() {
  setTimeout(() => {
    document.querySelectorAll('.dist-fill, .progress-fill').forEach(el => {
      const width = el.style.width;
      el.style.width = '0';
      requestAnimationFrame(() => { el.style.width = width; });
    });
  }, 100);
}

// ─── LEADERBOARD ──────────────────────────────────────────────
async function loadLeaderboard() {
  const el = document.getElementById('leaderboardList');
  el.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const data = await apiFetch('/users/leaderboard');
    if (data.leaderboard && data.leaderboard.length > 0) {
      el.innerHTML = data.leaderboard.map((c, i) => buildLeaderboardItem(c, i+1)).join('');
    } else {
      el.innerHTML = getDemoCourses().sort((a,b)=>b.averageRating-a.averageRating).map((c,i)=>buildLeaderboardItem(c,i+1)).join('');
    }
  } catch {
    el.innerHTML = getDemoCourses().sort((a,b)=>b.averageRating-a.averageRating).map((c,i)=>buildLeaderboardItem(c,i+1)).join('');
  }
}

function buildLeaderboardItem(c, rank) {
  const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
  const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
  return `
    <div class="leaderboard-item" onclick="navigate('course-detail','${c._id}')">
      <div class="rank-badge ${rankClass}">${medal}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:1rem">${c.title}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">${c.code} · ${c.instructor?.name || ''} · ${c.department}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1.4rem;font-weight:900;color:var(--primary)">${c.averageRating?.toFixed(1)||'N/A'}</div>
        <div style="color:var(--accent);font-size:.9rem">${renderStars(c.averageRating||0)}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${c.totalRatings||0} reviews</div>
      </div>
    </div>`;
}

// ─── INSTRUCTORS ──────────────────────────────────────────────
async function loadInstructors() {
  const el = document.getElementById('instructorsGrid');
  el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const data = await apiFetch('/users/instructors');
    if (data.instructors && data.instructors.length > 0) {
      el.innerHTML = data.instructors.map(i => buildInstructorCard(i)).join('');
    } else {
      el.innerHTML = getDemoInstructors().map(i => buildInstructorCard(i)).join('');
    }
  } catch {
    el.innerHTML = getDemoInstructors().map(i => buildInstructorCard(i)).join('');
  }
}

function getDemoInstructors() {
  return [
    { _id:'i1', name:'Prof. Sarah Mitchell', department:'Computer Science', bio:'Expert in ML and AI with 15 years of teaching experience.', courseCount:3, avgRating:4.85 },
    { _id:'i2', name:'Dr. James Patel', department:'Mathematics', bio:'PhD in Applied Mathematics, specialist in Data Analysis.', courseCount:2, avgRating:4.4 },
    { _id:'i3', name:'Prof. Emily Chen', department:'Engineering', bio:'Software Engineer turned educator, teaching Web Technologies for 10+ years.', courseCount:3, avgRating:4.65 },
    { _id:'i4', name:'Dr. Robert Kim', department:'Business', bio:'MBA with expertise in Project Management and Business Analytics.', courseCount:2, avgRating:4.45 }
  ];
}

function buildInstructorCard(inst) {
  return `
    <div class="instructor-card" onclick="navigate('instructor-detail','${inst._id}')">
      <div class="instructor-avatar">${inst.name[0]}</div>
      <div class="instructor-name">${inst.name}</div>
      <div class="instructor-dept">${inst.department}</div>
      <p style="font-size:.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">${inst.bio||'Experienced educator'}</p>
      <div class="instructor-stats">
        <div class="inst-stat">
          <div class="num">${inst.courseCount || 0}</div>
          <div class="lbl">Courses</div>
        </div>
        <div class="inst-stat">
          <div class="num">${inst.avgRating?.toFixed(1) || 'N/A'}</div>
          <div class="lbl">Avg Rating</div>
        </div>
        <div class="inst-stat">
          <div class="num">${inst.totalStudents || 0}</div>
          <div class="lbl">Students</div>
        </div>
      </div>
    </div>`;
}

async function loadInstructorDetail(id) {
  const container = document.getElementById('instructorDetailContent');
  container.innerHTML = `<div style="text-align:center;padding:80px"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const data = await apiFetch(`/users/instructors/${id}`);
    container.innerHTML = buildInstructorDetailHTML(data.instructor, data.courses, data.reviews, data.stats);
  } catch {
    const demo = getDemoInstructors().find(i => i._id === id) || getDemoInstructors()[0];
    container.innerHTML = buildInstructorDetailHTML(demo, getDemoCourses().slice(0,2), getDemoReviews(), { avgRating:4.8, totalStudents:245, totalCourses:3 });
  }
}

function buildInstructorDetailHTML(inst, courses, reviews, stats) {
  return `
    <div style="background:var(--gradient-dark);padding:80px 0 60px">
      <div class="container">
        <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">
          <div style="width:100px;height:100px;border-radius:50%;background:var(--gradient-primary);display:grid;place-items:center;color:white;font-size:2.5rem;font-weight:700;box-shadow:var(--shadow-primary);flex-shrink:0">${inst.name[0]}</div>
          <div>
            <h1 style="color:white;font-size:2rem;margin-bottom:6px">${inst.name}</h1>
            <p style="color:rgba(255,255,255,.6);margin-bottom:16px">${inst.department}</p>
            <p style="color:rgba(255,255,255,.75);max-width:600px;line-height:1.7;font-size:.95rem">${inst.bio || 'Experienced university instructor'}</p>
          </div>
          <div style="margin-left:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
            ${[
              { num: stats?.totalCourses || courses?.length || 0, lbl: 'Courses' },
              { num: stats?.avgRating?.toFixed(1) || 'N/A', lbl: 'Avg Rating' },
              { num: stats?.totalStudents || 0, lbl: 'Students' }
            ].map(s => `<div style="text-align:center;background:rgba(255,255,255,.08);border-radius:12px;padding:16px 20px">
              <div style="font-size:1.8rem;font-weight:900;color:white">${s.num}</div>
              <div style="font-size:.75rem;color:rgba(255,255,255,.5)">${s.lbl}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="container" style="padding:48px 24px">
      <h2 style="margin-bottom:24px">Courses by ${inst.name}</h2>
      <div class="grid-3" style="margin-bottom:48px">
        ${courses.map(c => buildCourseCard(c)).join('')}
      </div>
      <h2 style="margin-bottom:24px">Recent Student Reviews</h2>
      <div>${reviews.map(r => buildReviewCard(r)).join('')}</div>
    </div>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  const el = document.getElementById('dashboardContent');
  if (!currentUser) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔐</div><h3>Login Required</h3><p>Please sign in to view your dashboard.</p></div>`; return; }

  el.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;

  try {
    const [meData, myReviews] = await Promise.all([
      apiFetch('/auth/me'),
      apiFetch('/reviews/my')
    ]);
    const user = meData.user;
    const reviews = myReviews.reviews || [];
    el.innerHTML = buildDashboardHTML(user, reviews);
  } catch {
    el.innerHTML = buildDashboardHTML(currentUser, []);
  }
}

function buildDashboardHTML(user, reviews) {
  const roleColor = { student:'var(--success)', instructor:'var(--primary)', admin:'var(--danger)' }[user.role] || 'var(--primary)';
  const enrolled = user.enrolledCourses || [];

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:40px">
      <div style="display:flex;align-items:center;gap:20px">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--gradient-primary);display:grid;place-items:center;color:white;font-size:1.8rem;font-weight:700;box-shadow:var(--shadow-primary)">${user.name[0]}</div>
        <div>
          <h1 style="font-size:1.6rem;margin-bottom:4px">Welcome back, ${user.name.split(' ')[0]} 👋</h1>
          <p style="color:var(--text-muted);font-size:.9rem">${user.department || 'University'} · <span style="font-weight:600;color:${roleColor};text-transform:capitalize">${user.role}</span></p>
        </div>
      </div>
      ${user.role === 'instructor' || user.role === 'admin' ? `<button class="btn btn-primary" onclick="openModal('addCourseModal')">+ Add Course</button>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;margin-bottom:40px">
      <div class="stat-card">
        <div class="stat-icon blue">📚</div>
        <div><div class="stat-num">${enrolled.length}</div><div class="stat-label">Enrolled Courses</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">⭐</div>
        <div><div class="stat-num">${reviews.length}</div><div class="stat-label">Reviews Written</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div><div class="stat-num">${reviews.filter(r=>r.rating>=4).length}</div><div class="stat-label">Top Ratings Given</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon cyan">🎯</div>
        <div><div class="stat-num">${reviews.length>0?(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1):'—'}</div><div class="stat-label">Avg Rating Given</div></div>
      </div>
    </div>

    ${enrolled.length > 0 ? `
    <div style="margin-bottom:40px">
      <h2 style="margin-bottom:20px;font-size:1.2rem">My Enrolled Courses</h2>
      <div class="grid-3">
        ${enrolled.map(c => `
          <div class="course-card" onclick="navigate('course-detail','${c._id||c}')">
            <div class="course-card-thumb" style="background:var(--gradient-primary);height:120px">
              <div style="font-size:2.5rem;position:relative;z-index:1">📚</div>
            </div>
            <div class="course-card-body">
              <div class="course-code">${c.code||'COURSE'}</div>
              <div class="course-title">${c.title||'Course'}</div>
              <div class="course-meta">
                <div class="rating-display">
                  <div class="stars">${renderStars(c.averageRating||0)}</div>
                  <span class="rating-score">${c.averageRating?.toFixed(1)||'N/A'}</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openReviewModal('${c._id||c}')">Review</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2 style="font-size:1.2rem">My Reviews</h2>
        <button class="btn btn-secondary btn-sm" onclick="navigate('courses')">Browse Courses</button>
      </div>
      ${reviews.length === 0 
        ? buildEmptyState('No reviews yet', "You haven't reviewed any courses yet. Browse courses and share your experience!")
        : `<div style="display:flex;flex-direction:column;gap:16px">
          ${reviews.map(r => `
            <div class="review-card" style="display:flex;gap:20px;align-items:flex-start">
              <div style="min-width:140px;max-width:160px">
                ${r.course ? `
                  <div style="font-size:.72rem;font-weight:700;color:var(--primary-light);text-transform:uppercase;letter-spacing:.08em">${r.course.code||''}</div>
                  <div style="font-size:.88rem;font-weight:700;margin-top:2px;line-height:1.3">${r.course.title||''}</div>
                ` : ''}
              </div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <div style="color:var(--accent);font-size:1rem">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                  <span style="font-size:.75rem;color:var(--text-muted)">${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                ${r.title?`<div style="font-weight:700;margin-bottom:4px">${r.title}</div>`:''}
                <div style="font-size:.88rem;color:var(--text-secondary)">${r.comment||''}</div>
              </div>
              <button onclick="deleteMyReview('${r._id}')" class="btn btn-ghost btn-sm" style="color:var(--danger);flex-shrink:0">🗑</button>
            </div>`).join('')}
          </div>`}
    </div>`;
}

async function deleteMyReview(id) {
  if (!confirm('Delete this review?')) return;
  try {
    await apiFetch(`/reviews/${id}`, 'DELETE');
    showToast('Review deleted', 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── ADMIN ───────────────────────────────────────────────────
async function loadAdmin() {
  const el = document.getElementById('adminContent');
  el.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const [statsData, usersData, reviewsData, coursesData] = await Promise.all([
      apiFetch('/courses/stats/summary'),
      apiFetch('/users/all'),
      apiFetch('/reviews/all'),
      apiFetch('/courses?limit=100')
    ]);
    el.innerHTML = buildAdminHTML(statsData.stats, usersData.users, reviewsData.reviews, coursesData.courses);
  } catch {
    el.innerHTML = buildAdminHTML(
      { totalCourses:8, students:5, instructors:4, totalUsers:10 },
      getDemoUsers(),
      getDemoReviews().map(r=>({...r, course:{title:'Demo Course',code:'DEMO'}})),
      getDemoCourses()
    );
  }
}

function getDemoUsers() {
  return [
    { _id:'u1', name:'Dr. Admin', email:'admin@university.edu', role:'admin', department:'Administration', createdAt:new Date().toISOString() },
    { _id:'u2', name:'Prof. Sarah Mitchell', email:'sarah@university.edu', role:'instructor', department:'Computer Science', createdAt:new Date().toISOString() },
    { _id:'u3', name:'Alex Johnson', email:'alex@student.edu', role:'student', department:'Computer Science', createdAt:new Date().toISOString() },
    { _id:'u4', name:'Maya Williams', email:'maya@student.edu', role:'student', department:'Mathematics', createdAt:new Date().toISOString() }
  ];
}

function buildAdminHTML(stats, users, reviews, courses) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px">
      <div>
        <h1 style="font-size:1.8rem;margin-bottom:4px">Admin Dashboard 🛠️</h1>
        <p style="color:var(--text-muted)">Manage courses, users, and reviews</p>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="openModal('addCourseModal')">+ Add Course</button>
        <button class="btn btn-accent" onclick="seedDatabase()">🌱 Seed Demo Data</button>
      </div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px;margin-bottom:40px">
      <div class="stat-card"><div class="stat-icon blue">📚</div><div><div class="stat-num">${stats?.totalCourses||0}</div><div class="stat-label">Total Courses</div></div></div>
      <div class="stat-card"><div class="stat-icon cyan">👥</div><div><div class="stat-num">${stats?.students||0}</div><div class="stat-label">Students</div></div></div>
      <div class="stat-card"><div class="stat-icon amber">🎓</div><div><div class="stat-num">${stats?.instructors||0}</div><div class="stat-label">Instructors</div></div></div>
      <div class="stat-card"><div class="stat-icon green">⭐</div><div><div class="stat-num">${reviews?.length||0}</div><div class="stat-label">Total Reviews</div></div></div>
    </div>

    <!-- Users Table -->
    <div class="card" style="margin-bottom:28px">
      <div class="card-body">
        <h2 style="font-size:1.1rem;margin-bottom:20px">All Users</h2>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${(users||[]).map(u => `<tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="tag ${u.role==='admin'?'tag-danger':u.role==='instructor'?'tag-primary':'tag-success'}">${u.role}</span></td>
                <td>${u.department||'—'}</td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td><button onclick="deleteUser('${u._id}')" class="btn btn-ghost btn-sm" style="color:var(--danger)">Delete</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Courses Table -->
    <div class="card" style="margin-bottom:28px">
      <div class="card-body">
        <h2 style="font-size:1.1rem;margin-bottom:20px">All Courses</h2>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr>
              <th>Code</th><th>Title</th><th>Department</th><th>Rating</th><th>Reviews</th><th>Enrolled</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${(courses||[]).map(c => `<tr>
                <td><strong>${c.code}</strong></td>
                <td>${c.title}</td>
                <td>${c.department}</td>
                <td style="color:var(--accent);font-weight:700">★ ${c.averageRating?.toFixed(1)||'N/A'}</td>
                <td>${c.totalRatings||0}</td>
                <td>${c.enrolledStudents?.length||0}</td>
                <td><button onclick="navigate('course-detail','${c._id}')" class="btn btn-ghost btn-sm">View</button> <button onclick="deleteCourse('${c._id}')" class="btn btn-ghost btn-sm" style="color:var(--danger)">Delete</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Reviews Table -->
    <div class="card">
      <div class="card-body">
        <h2 style="font-size:1.1rem;margin-bottom:20px">Recent Reviews</h2>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr>
              <th>Student</th><th>Course</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${(reviews||[]).map(r => `<tr>
                <td><strong>${r.student?.name||'Unknown'}</strong></td>
                <td>${r.course?.code||''} ${r.course?.title||''}</td>
                <td style="color:var(--accent)">${'★'.repeat(r.rating)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.comment||''}</td>
                <td>${new Date(r.createdAt).toLocaleDateString()}</td>
                <td><button onclick="adminDeleteReview('${r._id}')" class="btn btn-ghost btn-sm" style="color:var(--danger)">Delete</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

async function seedDatabase() {
  showToast('Seeding database with demo data...', 'info');
  try {
    const data = await apiFetch('/seed', 'POST');
    showToast(`✅ ${data.message}`, 'success');
    loadAdmin();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await apiFetch(`/users/${id}`, 'DELETE');
    showToast('User deleted', 'success');
    loadAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCourse(id) {
  if (!confirm('Delete this course?')) return;
  try {
    await apiFetch(`/courses/${id}`, 'DELETE');
    showToast('Course deleted', 'success');
    loadAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

async function adminDeleteReview(id) {
  if (!confirm('Delete this review?')) return;
  try {
    await apiFetch(`/reviews/${id}`, 'DELETE');
    showToast('Review deleted', 'success');
    loadAdmin();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── REVIEW MODAL ─────────────────────────────────────────────
function openReviewModal(courseId) {
  if (!currentUser) { openModal('loginModal'); showToast('Please login to write a review', 'warning'); return; }
  document.getElementById('reviewCourseId').value = courseId;
  // Reset all ratings
  Object.keys(ratings).forEach(k => { ratings[k] = 0; });
  ['overall','content','clarity','material','assess'].forEach(k => {
    const prefix = { overall:'overall', content:'content', clarity:'clarity', material:'material', assess:'assess' }[k];
    document.querySelectorAll(`#${prefix}Stars .star, #${prefix.charAt(0).toUpperCase()+prefix.slice(1)}Stars .star`).forEach(s => s.classList.remove('active'));
  });
  resetStars('overallStars'); resetStars('contentStars'); resetStars('clarityStars');
  resetStars('materialStars'); resetStars('assessStars');
  document.getElementById('ratingOverall').value = 0;
  document.getElementById('ratingContent').value = 0;
  document.getElementById('ratingClarity').value = 0;
  document.getElementById('ratingMaterial').value = 0;
  document.getElementById('ratingAssess').value = 0;
  document.getElementById('reviewTitle').value = '';
  document.getElementById('reviewComment').value = '';
  document.getElementById('reviewPros').value = '';
  document.getElementById('reviewCons').value = '';
  document.getElementById('reviewAnonymous').checked = false;
  document.getElementById('charCount').textContent = '0';
  openModal('reviewModal');
}

function resetStars(containerId) {
  document.querySelectorAll(`#${containerId} .star`).forEach(s => s.classList.remove('active'));
}

function setRating(type, val) {
  const map = {
    overall: { hidden: 'ratingOverall', container: 'overallStars' },
    content: { hidden: 'ratingContent', container: 'contentStars' },
    clarity: { hidden: 'ratingClarity', container: 'clarityStars' },
    material: { hidden: 'ratingMaterial', container: 'materialStars' },
    assess: { hidden: 'ratingAssess', container: 'assessStars' }
  };
  const m = map[type];
  if (!m) return;
  document.getElementById(m.hidden).value = val;
  document.querySelectorAll(`#${m.container} .star`).forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

async function submitReview() {
  const courseId = document.getElementById('reviewCourseId').value;
  const rating = parseInt(document.getElementById('ratingOverall').value);
  const comment = document.getElementById('reviewComment').value.trim();

  if (!rating || rating < 1) { showToast('Please select an overall rating', 'warning'); return; }
  if (!comment) { showToast('Please write a review comment', 'warning'); return; }

  const body = {
    course: courseId,
    rating,
    contentQuality: parseInt(document.getElementById('ratingContent').value) || rating,
    instructorClarity: parseInt(document.getElementById('ratingClarity').value) || rating,
    courseMaterial: parseInt(document.getElementById('ratingMaterial').value) || rating,
    assessment: parseInt(document.getElementById('ratingAssess').value) || rating,
    title: document.getElementById('reviewTitle').value.trim(),
    comment,
    pros: document.getElementById('reviewPros').value.trim(),
    cons: document.getElementById('reviewCons').value.trim(),
    isAnonymous: document.getElementById('reviewAnonymous').checked,
    semester: document.getElementById('reviewSemester').value,
    year: parseInt(document.getElementById('reviewYear').value)
  };

  try {
    await apiFetch('/reviews', 'POST', body);
    showToast('Review submitted successfully! ⭐', 'success');
    closeModal('reviewModal');
    if (currentCourseId === courseId) loadCourseDetail(courseId);
    if (currentPage === 'dashboard') loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── ADD COURSE ───────────────────────────────────────────────
async function submitNewCourse() {
  const title = document.getElementById('newCourseTitle').value.trim();
  const code = document.getElementById('newCourseCode').value.trim();
  const description = document.getElementById('newCourseDesc').value.trim();
  const department = document.getElementById('newCourseDept').value.trim();
  const category = document.getElementById('newCourseCategory').value;
  const credits = parseInt(document.getElementById('newCourseCredits').value);
  const semester = document.getElementById('newCourseSemester').value;
  const year = parseInt(document.getElementById('newCourseYear').value);
  const tagsRaw = document.getElementById('newCourseTags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title || !code || !description || !department) {
    showToast('Please fill in all required fields', 'warning'); return;
  }

  try {
    await apiFetch('/courses', 'POST', { title, code, description, department, category, credits, semester, year, tags });
    showToast('Course created successfully! 🎉', 'success');
    closeModal('addCourseModal');
    if (currentPage === 'admin') loadAdmin();
    else navigate('courses');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── ENROLL ───────────────────────────────────────────────────
async function enrollCourse(courseId) {
  if (!currentUser) { openModal('loginModal'); return; }
  try {
    await apiFetch(`/courses/${courseId}/enroll`, 'POST');
    showToast('Successfully enrolled! 🎓', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── MODAL HELPERS ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function closeModalOutside(event, id) {
  if (event.target.id === id) closeModal(id);
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(60px)'; toast.style.transition = 'all .3s'; setTimeout(() => toast.remove(), 350); }, 3500);
}

// ─── MISC ─────────────────────────────────────────────────────
function initNavbarScroll() {
  window.addEventListener('scroll', () => {
    document.getElementById('mainNav')?.classList.toggle('scrolled', window.scrollY > 20);
  });
}

function initCharCounter() {
  const ta = document.getElementById('reviewComment');
  const counter = document.getElementById('charCount');
  if (ta && counter) {
    ta.addEventListener('input', () => { counter.textContent = ta.value.length; });
  }
}

function buildEmptyState(title, subtitle) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><h3>${title}</h3><p>${subtitle}</p></div>`;
}
