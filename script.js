let currentStudents = [];
let groupHistory = {}; // Changed to an object
let currentClassId = null; // To track the current class

async function loadStudents(classId, file) {
    try {
        const response = await fetch(file);
        const text = await response.text();
        currentStudents = text.split('\n').filter(name => name.trim() !== '');
        currentClassId = classId;
        document.getElementById('current-class-display').textContent = `Class ${classId} Loaded`;

        // Apply color theme
        document.body.classList.remove('theme-701', 'theme-702', 'theme-703', 'theme-704');
        document.body.classList.add(`theme-${classId}`);
        // Clear existing groups when a new class is loaded
        document.getElementById('groupsContainer').innerHTML = '';
        document.getElementById('shuffleBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
        document.getElementById('historyControls').style.display = 'flex'; // Show history controls on class load
    } catch (error) {
        console.error('Error loading student file:', error);
        alert(`Failed to load ${file}.`);
    }
}

function initializeApp() {
    document.getElementById('load701Btn').addEventListener('click', () => loadStudents('701', '701.txt'));
document.getElementById('load702Btn').addEventListener('click', () => loadStudents('702', '702.txt'));
document.getElementById('load703Btn').addEventListener('click', () => loadStudents('703', '703.txt'));
document.getElementById('load704Btn').addEventListener('click', () => loadStudents('704', '704.txt'));

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
        groups: groups
    };

    if (!groupHistory[currentClassId]) {
        groupHistory[currentClassId] = [];
    }
    groupHistory[currentClassId].push(newHistoryEntry);

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(groupHistory, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "group_history.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
    groups.forEach(group => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const pair = [group[i], group[j]].sort().join('|');
                if (historicalPairs.has(pair)) {
                    score++;
                }
            }
        }
    });
    return score;
}

function createGroups(students, groupSize) {
    const groupsContainer = document.getElementById('groupsContainer');
    groupsContainer.innerHTML = '';
    alert(`Creating groups for ${students.length} students.`);

    const historicalPairs = getHistoricalPairs(groupHistory[currentClassId]);
    let bestGrouping = [];
    let bestScore = Infinity;

    // If there are no students, exit the function
    if (students.length === 0) {
        return;
    }

    for (let attempt = 0; attempt < 100; attempt++) {
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const currentGrouping = [];
        for (let i = 0; i < shuffled.length; i += groupSize) {
            currentGrouping.push(shuffled.slice(i, i + groupSize));
        }

        const score = calculateScore(currentGrouping, historicalPairs);

        if (score < bestScore) {
            bestScore = score;
            bestGrouping = currentGrouping;
        }

        if (bestScore === 0) {
            break; // Found a perfect grouping
        }
    }

    console.log(`Best group score: ${bestScore} (0 is best)`);

    bestGrouping.forEach((groupStudents, index) => {
        const groupNumber = index + 1;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.id = `group-${groupNumber}`;
        groupDiv.innerHTML = `<h3>Group ${groupNumber}</h3>`;

        addDropHandlers(groupDiv);

        groupStudents.forEach(studentName => {
            const studentDiv = createStudentElement(studentName);
            groupDiv.appendChild(studentDiv);
        });

        groupsContainer.appendChild(groupDiv);
    });
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
    lockIcon.innerHTML = '&#128275;'; // Unlocked icon
    lockIcon.addEventListener('click', () => {
        const isLocked = studentDiv.classList.toggle('locked');
        lockIcon.innerHTML = isLocked ? '&#128274;' : '&#128275;'; // Locked vs Unlocked
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
