const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectBoard.jsx', 'utf8');

code = code.replace(
  /import toast from 'react-hot-toast';/,
  "import toast from 'react-hot-toast';\nimport Shepherd from 'shepherd.js';\nimport 'shepherd.js/dist/css/shepherd.css';"
);

code = code.replace(
  /useEffect\(\(\) => \{\n    loadData\(\);\n  \}, \[projectId\]\);/,
  `useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (!loading && tasks.length > 0 && !localStorage.getItem(\`hasSeenTour_\${projectId}\`)) {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shepherd-theme-custom',
          scrollTo: true,
          cancelIcon: { enabled: true }
        }
      });
      tour.addStep({
        title: 'Welcome to your board!',
        text: 'This is where the magic happens. Drag and drop tasks to update their status.',
        attachTo: { element: '.kanban-board', on: 'bottom' },
        buttons: [{ text: 'Next', action: tour.next, classes: 'btn btn-primary btn-sm' }]
      });
      tour.addStep({
        title: 'AI Summary',
        text: 'Click here to generate an AI summary of your project status.',
        attachTo: { element: 'button:contains("Summary")', on: 'bottom' },
        buttons: [{ text: 'Back', action: tour.back, classes: 'btn btn-secondary btn-sm' }, { text: 'Next', action: tour.next, classes: 'btn btn-primary btn-sm' }]
      });
      tour.addStep({
        title: 'Real-time Collaboration',
        text: 'See who else is online and collaborate in real-time!',
        attachTo: { element: '.avatar-sm', on: 'bottom' },
        buttons: [{ text: 'Back', action: tour.back, classes: 'btn btn-secondary btn-sm' }, { text: 'Done', action: tour.complete, classes: 'btn btn-primary btn-sm' }]
      });
      setTimeout(() => tour.start(), 1000);
      localStorage.setItem(\`hasSeenTour_\${projectId}\`, 'true');
    }
  }, [loading, tasks.length, projectId]);`
);

fs.writeFileSync('src/pages/ProjectBoard.jsx', code);
console.log('Patched ProjectBoard.jsx for Onboarding');
