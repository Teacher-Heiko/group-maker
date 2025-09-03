let currentStudents = [];
let groupHistory = {}; // Changed to object to store history by class
let currentClassId = null; // Track the current class
let incompatiblePairs = new Set();

async function loadStudents(classId) {
    try {
        const response = await fetch(`/students/${classId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        currentStudents = text.split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
        currentClassId = classId; // Set the current class ID
        
        // Load history for this class automatically
        await loadHistoryForClass(classId);
        
        // Initialize history for this class if it doesn't exist
        if (!groupHistory[classId]) {
            groupHistory[classId] = [];
        }
        
        document.getElementById('current-class-display').textContent = `Class ${classId} Loaded (${currentStudents.length} students)`;
        
        // Apply color theme
        document.body.classList.remove('theme-701', 'theme-702', 'theme-703', 'theme-704');
        document.body.classList.add(`theme-${classId}`);
        // Clear existing groups when a new class is loaded
        document.getElementById('groupsContainer').innerHTML = '';
        document.getElementById('shuffleBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
    } catch (error) {
        console.error('Error loading student file:', error);
        alert(`Failed to load students for class ${classId}.`);
    }
}

function initializeApp() {
    // Set up event listeners
    document.getElementById('load701Btn').addEventListener('click', () => loadStudents('701'));
    document.getElementById('load702Btn').addEventListener('click', () => loadStudents('702'));
    document.getElementById('load703Btn').addEventListener('click', () => loadStudents('703'));
    document.getElementById('load704Btn').addEventListener('click', () => loadStudents('704'));

document.getElementById('createGroupsBtn').addEventListener('click', () => {
    const groupSize = parseInt(document.getElementById('groupSizeInput').value);

    if (currentStudents.length === 0) {
        alert('Please load a class list first');
        return;
    }

    if (isNaN(groupSize) || groupSize < 2) {
        alert('Please enter a valid group size (2 or more)');
        return;
    }

    createGroups(currentStudents, groupSize);
    document.getElementById('shuffleBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'inline-block';
    document.getElementById('historyControls').style.display = 'flex';
});

document.getElementById('shuffleBtn').addEventListener('click', () => {
    const groupSize = parseInt(document.getElementById('groupSizeInput').value);
    if (isNaN(groupSize) || groupSize < 2) {
        alert('Please enter a valid group size (2 or more)');
        return;
    }
    
    if (!currentClassId) {
        alert('Please load a class first');
        return;
    }

    const unlockedStudents = [];
    const lockedStudentsByGroup = new Map();
    const groupElements = document.querySelectorAll('.group');

    groupElements.forEach(groupEl => {
        const lockedInGroup = [];
        groupEl.querySelectorAll('.student.locked span:first-child').forEach(studentEl => {
            lockedInGroup.push(studentEl.textContent);
        });
        lockedStudentsByGroup.set(groupEl.id, lockedInGroup);

        groupEl.querySelectorAll('.student:not(.locked)').forEach(studentEl => {
            unlockedStudents.push(studentEl.querySelector('span').textContent);
            studentEl.remove();
        });
    });

    const historicalPairs = getHistoricalPairs(groupHistory[currentClassId]);
    let bestGrouping = null;
    let bestScore = Infinity;

    for (let i = 0; i < 100; i++) { // 100 attempts to find a good shuffle
        const shuffled = [...unlockedStudents].sort(() => 0.5 - Math.random());
        const currentArrangement = new Map();
        groupElements.forEach(groupEl => {
            currentArrangement.set(groupEl.id, [...lockedStudentsByGroup.get(groupEl.id)]);
        });

        let studentIdx = 0;
        for (const groupEl of groupElements) {
            const group = currentArrangement.get(groupEl.id);
            while (group.length < groupSize && studentIdx < shuffled.length) {
                group.push(shuffled[studentIdx++]);
            }
        }
        // Handle remaining students for uneven groups
        for (const groupEl of groupElements) {
             if (studentIdx >= shuffled.length) break;
             const group = currentArrangement.get(groupEl.id);
             group.push(shuffled[studentIdx++]);
        }

        const score = calculateScore(Array.from(currentArrangement.values()), historicalPairs);
        if (score < bestScore) {
            bestScore = score;
            bestGrouping = currentArrangement;
        }
        if (bestScore === 0) break;
    }

    console.log(`Best shuffle score: ${bestScore}`);

    bestGrouping.forEach((students, groupId) => {
        const groupEl = document.getElementById(groupId);
        // Clear only unlocked students
        groupEl.querySelectorAll('.student:not(.locked)').forEach(el => el.remove());
        students.forEach(studentName => {
            // Add only if not already present (as a locked student)
            if (!lockedStudentsByGroup.get(groupId).includes(studentName)) {
                groupEl.appendChild(createStudentElement(studentName));
            }
        });
    });
});

document.getElementById('saveBtn').addEventListener('click', async () => {
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

    try {
        const response = await fetch(`/history/${currentClassId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(groupHistory[currentClassId], null, 2),
        });
        if (response.ok) {
            alert('History saved successfully!');
        } else {
            throw new Error('Failed to save history');
        }
    } catch (error) {
        console.error('Error saving history:', error);
        alert('Error saving history.');
    }
});

document.getElementById('historyInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const history = JSON.parse(e.target.result);
            // Basic validation for the new structure
            if (typeof history === 'object' && !Array.isArray(history)) {
                groupHistory = history;
                alert('Group history loaded successfully!');
            } else {
                alert('Invalid or outdated history file format.');
            }
        } catch (error) {
            alert('Error parsing history file.');
            console.error(error);
        }
    };
    reader.readAsText(file);
});

document.getElementById('markIncompatibleBtn').addEventListener('click', () => {
    const input = document.getElementById('incompatibleInput').value;
    const names = input.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 2) {
        const pair = names.sort().join('|');
        incompatiblePairs.add(pair);
        document.getElementById('incompatibleInput').value = '';
        alert('Students marked as incompatible');
    } else {
        alert('Please enter exactly two names separated by comma');
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

document.getElementById('loadDateBtn').addEventListener('click', () => {
    const selectedDate = document.getElementById('historyDateInput').value;
    if (!selectedDate) {
        alert('Please select a date');
        return;
    }
    if (!currentClassId) {
        alert('Please load a class first');
        return;
    }
    const history = groupHistory[currentClassId];
    if (!history || history.length === 0) {
        alert('No history available for this class');
        return;
    }
    
    const selectedDateObj = new Date(selectedDate);
    const entriesOnDate = history.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.toDateString() === selectedDateObj.toDateString();
    });
    
    if (entriesOnDate.length === 0) {
        alert('No groups saved on this date');
        return;
    }
    
    // Load the latest entry for that date
    const latestEntry = entriesOnDate.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    loadGroupsFromEntry(latestEntry);
    alert(`Loaded groups from ${selectedDate}`);
});
}

async function loadHistoryForClass(classId) {
    try {
        const response = await fetch(`/history/${classId}`);
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

function getHistoricalPairs(classHistory) {
    const pairs = new Set();
    if (!classHistory) {
        return pairs;
    }
    classHistory.forEach(entry => {
        entry.groups.forEach(group => {
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const pair = [group[i], group[j]].sort().join('|');
                    pairs.add(pair);
                }
            }
        });
    });
    return pairs;
}

function calculateScore(groups, historicalPairs) {
    let score = 0;
    let incompatiblePenalty = 0;
    groups.forEach(group => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const pair = [group[i], group[j]].sort().join('|');
                if (historicalPairs.has(pair)) {
                    score++;
                }
                if (incompatiblePairs.has(pair)) {
                    incompatiblePenalty += 1000;
                }
            }
        }
    });
    return score + incompatiblePenalty;
}

function createGroups(students, groupSize) {
    const groupsContainer = document.getElementById('groupsContainer');
    groupsContainer.innerHTML = '';
    
    // Shuffle students
    const shuffledStudents = [...students].sort(() => 0.5 - Math.random());
    
    // Calculate number of groups needed
    const numGroups = Math.ceil(students.length / groupSize);
    
    // Create groups
    for (let i = 0; i < numGroups; i++) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.id = `group-${i + 1}`;
        groupDiv.innerHTML = `<h3>Group ${i + 1}</h3>`;
        
        // Add students to group
        const start = i * groupSize;
        const end = start + groupSize;
        const groupStudents = shuffledStudents.slice(start, end);
        
        groupStudents.forEach(student => {
            groupDiv.appendChild(createStudentElement(student));
        });
        
        addDropHandlers(groupDiv);
        groupsContainer.appendChild(groupDiv);
    }
    
    // Show action buttons
    document.getElementById('shuffleBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'inline-block';
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

document.addEventListener('DOMContentLoaded', initializeApp);
