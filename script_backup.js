let currentStudents = [];
let groupHistory = {}; // Changed to object to store history by class
let currentClassId = null; // Track the current class
let incompatiblePairs = new Set();

async function loadStudentsBasic(classId) {
    console.log('Loading students for class', classId);
    try {
        // Use relative path
        const response = await fetch('./' + classId + '.txt');
        console.log('Fetch response', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log('Loaded text', text);
        currentStudents = text.split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
        console.log('Parsed students', currentStudents);
        currentClassId = classId; // Set the current class ID
        
        // Initialize history for this class if it doesn't exist
        if (!groupHistory[classId]) {
            groupHistory[classId] = [];
        }
        
        // Apply color theme
        document.body.classList.remove('theme-701', 'theme-702', 'theme-703', 'theme-704');
        document.body.classList.add(`theme-${classId}`);
        // Clear existing groups when a new class is loaded
        document.getElementById('groupsContainer').innerHTML = '';
        document.getElementById('shuffleBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
    } catch (error) {
        console.error('Error loading student file:', error);
        alert(`Failed to load ${classId}.txt. Error: ${error.message}`);
    }
}

function finishLoadingClass(classId) {
    document.getElementById('current-class-display').textContent = `Class ${classId} Loaded (${currentStudents.length} students)`;
    document.querySelector('.controls').style.display = 'flex';
    populateHistoryDropdown();
}

async function selectHistory(classId) {
    await loadStudentsBasic(classId);
    await loadHistoryForClass(classId);
    
    const history = groupHistory[classId];
    if (history && history.length > 0) {
        showInitialModal(classId, history);
    } else {
        finishLoadingClass(classId);
    }
}

function showInitialModal(classId, history) {
    document.getElementById('modalClassId').textContent = classId;
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    
    const loadFromHistoryBtn = document.createElement('button');
    loadFromHistoryBtn.textContent = 'Load from History';
    loadFromHistoryBtn.addEventListener('click', () => showHistoryList(history));
    
    const startFreshBtn = document.createElement('button');
    startFreshBtn.textContent = 'Start Fresh';
    startFreshBtn.addEventListener('click', () => {
        finishLoadingClass(classId);
        hideModal();
    });
    
    list.appendChild(loadFromHistoryBtn);
    list.appendChild(startFreshBtn);
    
    document.getElementById('historyModal').style.display = 'block';
}

function showHistoryList(history) {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => {
        const classId = document.getElementById('modalClassId').textContent;
        showInitialModal(classId, history);
    });
    list.appendChild(backBtn);
    
    history.slice().reverse().forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = new Date(entry.timestamp).toLocaleString();
        item.addEventListener('click', async () => {
            const classId = document.getElementById('modalClassId').textContent;
            await loadStudentsBasic(classId);
            loadGroupsFromEntry(entry);
            hideModal();
        });
        list.appendChild(item);
    });
}

function hideModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function populateHistoryDropdown() {
    const select = document.getElementById('historySelect');
    select.innerHTML = '<option value="">Select History Entry</option>';
    
    if (currentClassId && groupHistory[currentClassId]) {
        groupHistory[currentClassId].forEach((entry, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = new Date(entry.timestamp).toLocaleString();
            select.appendChild(option);
        });
    }
}

function loadGroupsFromEntry(entry) {
    // Clear existing groups
    document.getElementById('groupsContainer').innerHTML = '';

    const groups = entry.groups;

    // Set currentStudents to all students in the groups
    currentStudents = groups.flat();
    
    // Update display
    document.getElementById('current-class-display').textContent = `Class ${currentClassId} Loaded (${currentStudents.length} students)`;

    // Recreate groups
    groups.forEach((group, index) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.id = `group-${index + 1}`;
        groupDiv.innerHTML = `<h3>Group ${index + 1}</h3>`;
        
        group.forEach(student => {
            groupDiv.appendChild(createStudentElement(student));
        });
        
        document.getElementById('groupsContainer').appendChild(groupDiv);
    });

    // Restore incompatible pairs
    incompatiblePairs = new Set(entry.incompatiblePairs);

    // Show action buttons
    document.getElementById('shuffleBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'inline-block';
    populateHistoryDropdown();
}

async function loadHistoryForClass(classId) {
    try {
        const response = await fetch('./' + classId + '_history.json');
        if (!response.ok) {
            // History file doesn't exist, that's fine
            return;
        }
        const history = await response.json();
        groupHistory[classId] = history;
        // Load incompatible pairs from the last history entry
        if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            incompatiblePairs = new Set(lastEntry.incompatiblePairs || []);
        }
        console.log(`History loaded for class ${classId}`);
    } catch (error) {
        console.log(`No history file found for class ${classId}`);
    }
}

function createGroups(students, numGroups) {
    const groupsContainer = document.getElementById('groupsContainer');
    groupsContainer.innerHTML = '';
    
    // Shuffle students
    const shuffledStudents = [...students].sort(() => 0.5 - Math.random());
    
    // Calculate group sizes for even distribution
    const baseSize = Math.floor(students.length / numGroups);
    const remainder = students.length % numGroups;
    
    let studentIdx = 0;
    for (let i = 0; i < numGroups; i++) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.id = `group-${i + 1}`;
        groupDiv.innerHTML = `<h3>Group ${i + 1}</h3>`;
        
        const groupSize = baseSize + (i < remainder ? 1 : 0);
        for (let j = 0; j < groupSize; j++) {
            groupDiv.appendChild(createStudentElement(shuffledStudents[studentIdx++]));
        }
        
        addDropHandlers(groupDiv);
        groupsContainer.appendChild(groupDiv);
    }
    
    // Show action buttons
    document.getElementById('shuffleBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'inline-block';
    populateHistoryDropdown();
}

let draggedItem = null;

function addDragHandlers(item) {
    item.addEventListener('dragstart', () => {
        draggedItem = item;
        setTimeout(() => {
            item.classList.add('dragging');
        }, 0);
    });

    item.addEventListener('dragend', () => {
        setTimeout(() => {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }, 0);
    });
}

function createStudentElement(studentName) {
    const studentDiv = document.createElement('div');
    studentDiv.className = 'student';
    studentDiv.draggable = true;
    
    const studentNameSpan = document.createElement('span');
    studentNameSpan.textContent = studentName;
    
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon';
    lockIcon.textContent = '🔒';
    
    lockIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isLocked = studentDiv.classList.toggle('locked');
        lockIcon.textContent = isLocked ? '🔓' : '🔒';
        studentDiv.draggable = !isLocked;
    });
    
    studentDiv.appendChild(studentNameSpan);
    studentDiv.appendChild(lockIcon);
    
    addDragHandlers(studentDiv);
    return studentDiv;
}

function addDropHandlers(group) {
    group.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    group.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (draggedItem && group !== draggedItem.parentNode) { 
            group.style.backgroundColor = '#e0e0e0';
        }
    });

    group.addEventListener('dragleave', () => {
        group.style.backgroundColor = '#f9f9f9';
    });

    group.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem && group !== draggedItem.parentNode) {
            group.appendChild(draggedItem);
        }
        group.style.backgroundColor = '#f9f9f9';
    });
}

function initializeApp() {
    // Set up event listeners
    document.getElementById('load701Btn').addEventListener('click', () => selectHistory('701'));
    document.getElementById('load702Btn').addEventListener('click', () => selectHistory('702'));
    document.getElementById('load703Btn').addEventListener('click', () => selectHistory('703'));
    document.getElementById('load704Btn').addEventListener('click', () => selectHistory('704'));

    document.getElementById('createGroupsBtn').addEventListener('click', () => {
        const numGroups = parseInt(document.getElementById('numGroupsInput').value);

        if (currentStudents.length === 0) {
            alert('Please load a class list first');
            return;
        }

        if (isNaN(numGroups) || numGroups < 1) {
            alert('Please enter a valid number of groups (1 or more)');
            return;
        }

        if (numGroups > currentStudents.length) {
            alert('Number of groups cannot exceed number of students');
            return;
        }

        createGroups(currentStudents, numGroups);
        document.getElementById('shuffleBtn').style.display = 'inline-block';
        document.getElementById('saveBtn').style.display = 'inline-block';
        populateHistoryDropdown();
    });

    document.getElementById('shuffleBtn').addEventListener('click', () => {
        const numGroups = parseInt(document.getElementById('numGroupsInput').value);
        if (isNaN(numGroups) || numGroups < 1) {
            alert('Please enter a valid number of groups (1 or more)');
            return;
        }
        
        if (!currentClassId) {
            alert('Please load a class first');
            return;
        }

        // Simple and robust shuffle approach
        const groupElements = document.querySelectorAll('.group');
        const unlockedStudents = [];
        const lockedStudents = [];
        
        // Collect all students and their lock status
        groupElements.forEach(groupEl => {
            const studentsInGroup = [];
            groupEl.querySelectorAll('.student').forEach(studentEl => {
                const studentName = studentEl.querySelector('span').textContent;
                const isLocked = studentEl.classList.contains('locked');
                studentsInGroup.push({ name: studentName, locked: isLocked, element: studentEl });
                
                if (!isLocked) {
                    unlockedStudents.push(studentName);
                } else {
                    lockedStudents.push({ name: studentName, groupId: groupEl.id });
                }
            });
        });

        console.log(`Found ${unlockedStudents.length} unlocked and ${lockedStudents.length} locked students`);

        // Shuffle unlocked students
        const shuffledUnlocked = [...unlockedStudents].sort(() => 0.5 - Math.random());
        
        // Clear all groups
        groupElements.forEach(groupEl => {
            groupEl.innerHTML = `<h3>${groupEl.querySelector('h3').textContent}</h3>`;
        });

        // Rebuild groups with locked students in their original positions
        const lockedByGroup = {};
        lockedStudents.forEach(locked => {
            if (!lockedByGroup[locked.groupId]) {
                lockedByGroup[locked.groupId] = [];
            }
            lockedByGroup[locked.groupId].push(locked.name);
        });

        // Calculate how many unlocked students per group
        const actualNumGroups = groupElements.length;
        const unlockedPerGroup = Math.floor(shuffledUnlocked.length / actualNumGroups);
        const remainder = shuffledUnlocked.length % actualNumGroups;
        
        let unlockedIdx = 0;
        
        groupElements.forEach((groupEl, idx) => {
            // Add locked students back first
            const lockedInThisGroup = lockedByGroup[groupEl.id] || [];
            lockedInThisGroup.forEach(studentName => {
                const studentEl = createStudentElement(studentName);
                studentEl.classList.add('locked');
                studentEl.querySelector('.lock-icon').textContent = '🔓';
                studentEl.draggable = false;
                groupEl.appendChild(studentEl);
            });
            
            // Add unlocked students
            const targetUnlocked = unlockedPerGroup + (idx < remainder ? 1 : 0);
            for (let i = 0; i < targetUnlocked && unlockedIdx < shuffledUnlocked.length; i++) {
                groupEl.appendChild(createStudentElement(shuffledUnlocked[unlockedIdx++]));
            }
        });

        console.log(`Shuffle complete. Distributed ${unlockedIdx} unlocked students`);
        
        // Verify all students are present
        let totalStudents = 0;
        document.querySelectorAll('.student').forEach(() => totalStudents++);
        console.log(`Total students after shuffle: ${totalStudents}`);
        
        populateHistoryDropdown();
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!currentClassId) {
            alert('Please load a class before saving.');
            return;
        }

        const groups = [];
        document.querySelectorAll('.group').forEach(groupEl => {
            const students = [];
            groupEl.querySelectorAll('.student span:first-child').forEach(studentEl => {
                students.push(studentEl.textContent);
            });
            groups.push(students);
        });

        const newHistoryEntry = {
            timestamp: new Date().toISOString(),
            groups: groups,
            incompatiblePairs: Array.from(incompatiblePairs)
        };

        if (!groupHistory[currentClassId]) {
            groupHistory[currentClassId] = [];
        }
        groupHistory[currentClassId].push(newHistoryEntry);

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(groupHistory[currentClassId], null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `${currentClassId}_history.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        populateHistoryDropdown();
    });

    document.getElementById('markIncompatibleBtn').addEventListener('click', () => {
        const input = document.getElementById('incompatibleInput').value;
        const names = input.split(',').map(n => n.trim()).filter(n => n);
        if (names.length >= 2) {
            for (let i = 0; i < names.length; i++) {
                for (let j = i + 1; j < names.length; j++) {
                    const pair = [names[i], names[j]].sort().join('|');
                    incompatiblePairs.add(pair);
                }
            }
            document.getElementById('incompatibleInput').value = '';
            alert('Students marked as incompatible');
        } else {
            alert('Please enter at least two names separated by comma');
        }
    });

    document.getElementById('addGroupBtn').addEventListener('click', () => {
        const groupsContainer = document.getElementById('groupsContainer');
        const existingGroups = document.querySelectorAll('.group');
        const numGroups = existingGroups.length + 1;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.id = `group-${numGroups}`;
        groupDiv.innerHTML = `<h3>Group ${numGroups}</h3>`;
        addDropHandlers(groupDiv);
        groupsContainer.appendChild(groupDiv);
    });

    document.getElementById('historySelect').addEventListener('change', (event) => {
        const selectedIndex = event.target.value;
        if (selectedIndex !== '' && currentClassId && groupHistory[currentClassId]) {
            const entry = groupHistory[currentClassId][selectedIndex];
            if (entry) {
                loadGroupsFromEntry(entry);
            }
        }
        // Reset the dropdown
        event.target.value = '';
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        hideModal();
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
