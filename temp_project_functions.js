
// Save projects to localStorage
function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

// Load projects from localStorage
function loadProjects() {
    const saved = localStorage.getItem('projects');
    if (saved) {
        const parsed = JSON.parse(saved);
        projects = parsed.map(data => {
            const project = new Project(
                data.id,
                data.name,
                data.type,
                data.category || 'mama',
                data.bookIds || [],
                data.startDate || null,
                data.endDate || null,
                data.bufferDays || 0
            );
            project.expanded = false; // Always start collapsed
            return project;
        });
    }
}
