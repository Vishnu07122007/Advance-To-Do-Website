document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('todo-form');
    const taskInput = document.getElementById('task-input');
    const taskDue = document.getElementById('task-due');
    if (taskDue) {
        const now = new Date();
        taskDue.min = getLocalDateTimeString(now);
    }
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Modal elements
    const modal = document.getElementById('confirm-modal');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    const dontAskCheckbox = document.getElementById('dont-ask-again');



    // Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB1o3z24WgWDz-nE2K3AKXvsB-9m6DtEDM",
  authDomain: "advance-to-do-web.firebaseapp.com",
  projectId: "advance-to-do-web",
storageBucket: "advance-to-do-web.appspot.com",
  messagingSenderId: "433603440709",
  appId: "1:433603440709:web:3fa6f15fe24b354b35332c"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// DOM references
const loginBtn = document.getElementById('login-btn');
const userInfoDiv = document.getElementById('user-info');
const profileBtn = document.getElementById('profile-btn');  // make sure this exists in HTML
const welcomeMsg = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');

// Event Listeners
loginBtn.addEventListener('click', () => {
  window.location.href = 'login.html';
});

if(profileBtn) {
  profileBtn.addEventListener('click', () => {
    window.location.href = 'profile.html';
  });
}

logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.reload();
  });
});

// Listen for auth state changes and toggle UI accordingly
auth.onAuthStateChanged(user => {
  if (user) {
    loginBtn.style.display = 'none';
    userInfoDiv.style.display = 'block';
welcomeMsg.textContent = `Logged in as: ${user.email}`;
  } else {
    loginBtn.style.display = 'inline-block';
    userInfoDiv.style.display = 'none';
    welcomeMsg.textContent = '';
  }
});


auth.onAuthStateChanged(user => {
  if (user) {
    // User is logged in
    document.getElementById('logout-btn').style.display = 'block';
    document.getElementById('login-btn').style.display = 'none';
    // Load user data here...
  } else {
    // User is NOT logged in
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'none';
  }
});





    // Voice elements
    const voiceBtn = document.getElementById('voice-btn');
    const micIcon = document.getElementById('mic-icon');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let filter = 'all';
    let taskToDeleteIndex = null;
    let timerIntervals = [];

    // Request notification permission only once if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

   function formatTimeLeft(ms) {
    if (ms <= 0) return "Time's up!";
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}


    function clearAllTimers() {
        timerIntervals.forEach(id => clearInterval(id));
        timerIntervals = [];
    }

    function getStatusClass(task) {
        if (task.completed) return 'completed';
        if (task.due) {
            const dueTime = new Date(task.due).getTime();
            const now = Date.now();
            if (dueTime < now) return 'overdue';
            if (dueTime - now < 3600 * 1000) return 'due-soon'; // less than 1 hour
        }
        return '';
    }

    function renderTasks() {
        clearAllTimers();
        taskList.innerHTML = '';
        let filteredTasks = tasks.slice();

        if (!priorityMode) {
            if (filter === 'active') {
                filteredTasks = filteredTasks.filter(t => !t.completed);
            } else if (filter === 'completed') {
                filteredTasks = filteredTasks.filter(t => t.completed);
            }
        }

        if (priorityMode) {
            filteredTasks = filteredTasks.filter(t => !t.completed);
            filteredTasks.sort((a, b) => {
                if (a.due && b.due) return new Date(a.due) - new Date(b.due);
                if (a.due && !b.due) return -1;
                if (!a.due && b.due) return 1;
                return 0;
            });
        } else {
            filteredTasks.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.due && b.due) {
                    const aTime = new Date(a.due).getTime();
                    const bTime = new Date(b.due).getTime();
                    if (aTime !== bTime) return aTime - bTime;
                } else if (a.due && !b.due) {
                    return -1;
                } else if (!a.due && b.due) {
                    return 1;
                }
                return tasks.indexOf(b) - tasks.indexOf(a);
            });
        }

        filteredTasks.forEach((task, idx) => {
            const card = document.createElement('div');
card.className = `task-card ${getStatusClass(task)}`;
            const mainRow = document.createElement('div');
            mainRow.className = 'task-main';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-complete';
            checkbox.checked = task.completed;
            checkbox.disabled = tasks.some(t => t.editing);
            checkbox.addEventListener('change', () => {
                const originalIndex = tasks.findIndex(t => t === task);
                tasks[originalIndex].completed = checkbox.checked;
                saveTasks();
                renderTasks();
            });
            mainRow.appendChild(checkbox);

            let titleEl;
            if (task.editing && !task.completed) {
                titleEl = document.createElement('input');
                titleEl.type = 'text';
                titleEl.value = task.text;
                titleEl.className = 'task-title';
                titleEl.style.minWidth = '120px';
                setTimeout(() => titleEl.focus(), 0);

                const calendarContainer = document.createElement('span');
                calendarContainer.style.position = 'relative';
                calendarContainer.style.display = 'inline-block';
                calendarContainer.style.width = '30px';
                calendarContainer.style.height = '30px';
                calendarContainer.style.marginLeft = '2px';

                const calendarIcon = document.createElement('span');
                calendarIcon.innerHTML = '📅';
                calendarIcon.title = 'Edit due date & time';
                calendarIcon.className = 'calendar-icon-btn';
                calendarIcon.style.fontSize = '20px';
                calendarIcon.style.cursor = 'pointer';
                calendarIcon.style.marginLeft = '8px';

                const dueInput = document.createElement('input');
                dueInput.type = 'datetime-local';
                dueInput.value = task.due ? getLocalDateTimeString(new Date(task.due)) : '';
                dueInput.className = 'task-due-edit';
                dueInput.min = getLocalDateTimeString(new Date());

                dueInput.style.opacity = '0';
                dueInput.style.position = 'absolute';
                dueInput.style.width = '1px';
                dueInput.style.height = '1px';
                dueInput.style.pointerEvents = 'none';

                calendarIcon.addEventListener('click', () => {
                    dueInput.showPicker();
                });
                calendarIcon.setAttribute('tabindex', '0');
                calendarIcon.setAttribute('role', 'button');
                calendarIcon.setAttribute('aria-label', 'Edit due date and time');

                calendarIcon.addEventListener('click', () => {
                    dueInput.focus();
                    dueInput.click();
                });

                dueInput.addEventListener('change', () => {
                    const newDue = dueInput.value;
                    if (newDue) {
                        task.due = new Date(newDue).toISOString();
                        saveTasks();
                        renderTasks();
                    }
                });

                titleEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveEdit();
                });

                dueInput.addEventListener('change', saveEdit);

                function saveEdit() {
                    const originalIndex = tasks.findIndex(t => t === task);
                    tasks[originalIndex].text = titleEl.value.trim() || tasks[originalIndex].text;
                    tasks[originalIndex].due = dueInput.value ? new Date(dueInput.value).toISOString() : null;
                    delete tasks[originalIndex].editing;
                    tasks[originalIndex].notified = false;
                    saveTasks();
                    renderTasks();
                }

                calendarContainer.appendChild(calendarIcon);
                calendarContainer.appendChild(dueInput);

                const editContainer = document.createElement('div');
                editContainer.style.display = 'flex';
                editContainer.style.alignItems = 'center';
                editContainer.appendChild(titleEl);
                editContainer.appendChild(calendarContainer);

                mainRow.appendChild(editContainer);
            } else {
                titleEl = document.createElement('span');
                titleEl.className = 'task-title' + (task.completed ? ' completed' : '');
                titleEl.textContent = task.text;
                mainRow.appendChild(titleEl);
            }
            mainRow.appendChild(titleEl);

            const dateInfo = document.createElement('div');
            dateInfo.className = 'task-date-info';

            if (task.due) {
                const dueEl = document.createElement('span');
                dueEl.className = 'task-due';
                dueEl.textContent = 'Due: ' + new Date(task.due).toLocaleString();
                dateInfo.appendChild(dueEl);

                if (!task.completed) {
                    const timerEl = document.createElement('span');
                    timerEl.className = 'task-timer';
                    function updateTimer() {
                        const ms = new Date(task.due).getTime() - Date.now();
                        timerEl.textContent = formatTimeLeft(ms);
                        if (ms <= 0) timerEl.style.color = 'var(--danger)';
                    }
                    updateTimer();
                    const intervalId = setInterval(updateTimer, 1000);
                    timerIntervals.push(intervalId);
                    dateInfo.appendChild(timerEl);
                }
            }

            if (task.createdAt) {
                const createdEl = document.createElement('span');
                createdEl.className = 'task-created';
                createdEl.textContent = 'Added: ' + new Date(task.createdAt).toLocaleString();
                dateInfo.appendChild(createdEl);
            }

            mainRow.appendChild(dateInfo);

            const actions = document.createElement('div');
            actions.className = 'task-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = task.editing
                ? '<i class="fa-solid fa-check"></i>'
                : '<i class="fa-solid fa-pen"></i>';
            editBtn.title = task.editing ? 'Save' : 'Edit';
            editBtn.disabled = task.completed || (tasks.some(t => t.editing) && !task.editing);

            editBtn.addEventListener('click', (e) => {
                if (task.completed) return;
                if (!task.editing) {
                    tasks.forEach(t => delete t.editing);
                    task.editing = true;
                    renderTasks();
                } else {
                    const originalIndex = tasks.findIndex(t => t === task);
                    const input = card.querySelector('input.task-title');
                    tasks[originalIndex].text = input.value.trim() || tasks[originalIndex].text;
                    delete tasks[originalIndex].editing;
                    saveTasks();
                    renderTasks();
                }
            });
            actions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            if (task.editing) {
                deleteBtn.title = "Cancel";
                deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                deleteBtn.disabled = false;
                deleteBtn.addEventListener('click', () => {
                    delete task.editing;
                    renderTasks();
                });
            } else {
                deleteBtn.title = "Delete";
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.disabled = tasks.some(t => t.editing);
                deleteBtn.addEventListener('click', () => {
                    showModal(tasks.indexOf(task));
                });
            }
            actions.appendChild(deleteBtn);

            mainRow.appendChild(actions);
            card.appendChild(mainRow);
            taskList.appendChild(card);
        });

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div style="text-align:center;color:#888;">No tasks found.</div>';
        }

        const isEditing = tasks.some(t => t.editing);
        document.getElementById('task-input').disabled = isEditing;
        document.getElementById('task-due').disabled = isEditing;
        document.querySelector('#todo-form button[type="submit"]').disabled = isEditing;
        document.getElementById('voice-btn').disabled = isEditing;
    }

    form.addEventListener('submit', function (e) {
        const dueValue = taskDue.value;
        if (dueValue) {
            const selected = new Date(dueValue);
            const now = new Date();
            if (selected < now) {
                alert('Please select a future date and time.');
                e.preventDefault();
                return;
            }
        }
        const task = taskInput.value.trim();
        const due = taskDue.value;
        if (task) {
            tasks.push({
                text: task,
                due: due || null,
                completed: false,
                notes: '',
                editing: false,
                notified: false,
                createdAt: new Date().toISOString()
            });
            saveTasks();
            renderTasks();
            taskInput.value = '';
            taskDue.value = '';
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            priorityMode = false;
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filter = this.getAttribute('data-filter');
            renderTasks();
        });
    });

    function showModal(index) {
        if (localStorage.getItem('skipDeleteConfirm') === 'true') {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
            return;
        }
        taskToDeleteIndex = index;
        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
        taskToDeleteIndex = null;
    }

    yesBtn.addEventListener('click', () => {
        if (dontAskCheckbox.checked) {
            localStorage.setItem('skipDeleteConfirm', 'true');
        }
        if (taskToDeleteIndex !== null) {
            tasks.splice(taskToDeleteIndex, 1);
            saveTasks();
            renderTasks();
            taskToDeleteIndex = null;
        }
        hideModal();
    });

    noBtn.addEventListener('click', () => {
        hideModal();
    });

    // Voice Recognition Feature for task title
  let recognition;
let recognizing = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = function () {
        recognizing = true;
        micIcon.classList.add('listening');
    };

    recognition.onend = function () {
        recognizing = false;
        micIcon.classList.remove('listening');
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        taskInput.value = transcript;
    };

    voiceBtn.addEventListener('click', () => {
        if (recognizing) {
            recognition.stop();
            return;
        }
        recognition.start();
    });
} else {
    voiceBtn.style.display = 'none'; // Hide mic button if unsupported
}

    // Dark/Light Mode Toggle
  const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

function setTheme(mode) {
  body.className = mode;
  localStorage.setItem('theme', mode);
  themeToggle.innerHTML = mode === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Load saved theme or default to light
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = body.classList.contains('dark') ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
});


    const priorityBtn = document.getElementById('priority-btn');
    let priorityMode = false;

    priorityBtn.addEventListener('click', () => {
        priorityMode = true;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        priorityBtn.classList.add('active');
        renderTasks();
    });

    filterBtns.forEach(btn => {
        if (btn !== priorityBtn) {
            btn.addEventListener('click', function () {
                priorityMode = false;
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                filter = this.getAttribute('data-filter');
                renderTasks();
            });
        }
    });

    renderTasks();
});

function getLocalDateTimeString(date) {
    const pad = n => n.toString().padStart(2, '0');
    return date.getFullYear() + '-' +
        pad(date.getMonth() + 1) + '-' +
        pad(date.getDate()) + 'T' +
        pad(date.getHours()) + ':' +
        pad(date.getMinutes());
}

function finishEdit(index, newText, newNotes, newDue) {
    if (newDue) {
        const selected = new Date(newDue);
        const now = new Date();
        if (selected < now) {
            alert('Please select a future date and time.');
            return;
        }
    }
    // ...existing code to save the task...
}     