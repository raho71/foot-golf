/**
 * Main application logic for Foot Golf PWA
 */
const App = (function() {
    // State
    let currentScreen = 'home';
    let screenHistory = [];
    let currentCourse = null; // For editing
    let currentGame = null;
    let currentHoleIndex = 0;

    // DOM Elements
    const $pageTitle = document.getElementById('page-title');
    const $btnBack = document.getElementById('btn-back');
    const $mainContent = document.getElementById('main-content');

    // Initialize the app
    async function init() {
        await Storage.init();
        setupEventListeners();
        await checkForCurrentGame();
        showScreen('home');
    }

    // Check if there's an ongoing game
    async function checkForCurrentGame() {
        const game = await Storage.Games.getCurrent();
        const $btnResume = document.getElementById('btn-resume-game');
        if (game) {
            $btnResume.classList.remove('hidden');
        } else {
            $btnResume.classList.add('hidden');
        }
    }

    // Screen navigation
    function showScreen(screenId, addToHistory = true) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // Show target screen
        const $screen = document.getElementById(`screen-${screenId}`);
        if ($screen) {
            $screen.classList.add('active');
        }

        // Update history
        if (addToHistory && currentScreen !== screenId) {
            screenHistory.push(currentScreen);
        }
        currentScreen = screenId;

        // Update header
        updateHeader(screenId);

        // Scroll to top
        $mainContent.scrollTop = 0;
    }

    function goBack() {
        if (screenHistory.length > 0) {
            const previousScreen = screenHistory.pop();
            showScreen(previousScreen, false);
        } else {
            showScreen('home', false);
        }
    }

    function updateHeader(screenId) {
        const titles = {
            'home': 'Foot Golf',
            'courses': 'Parcours',
            'course-edit': currentCourse ? 'Modifier le parcours' : 'Nouveau parcours',
            'new-game': 'Nouvelle partie',
            'game': 'Partie en cours',
            'history': 'Historique',
            'game-detail': 'Détail partie',
            'records': 'Records',
            'settings': 'Paramètres'
        };

        $pageTitle.textContent = titles[screenId] || 'Foot Golf';
        
        if (screenId === 'home') {
            $btnBack.classList.add('hidden');
        } else {
            $btnBack.classList.remove('hidden');
        }
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Back button
        $btnBack.addEventListener('click', goBack);

        // Home screen buttons
        document.getElementById('btn-resume-game').addEventListener('click', resumeGame);
        document.getElementById('btn-new-game').addEventListener('click', () => showNewGameScreen());
        document.getElementById('btn-courses').addEventListener('click', () => showCoursesScreen());
        document.getElementById('btn-history').addEventListener('click', () => showHistoryScreen());
        document.getElementById('btn-records').addEventListener('click', () => showRecordsScreen());
        document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));

        // Settings
        document.getElementById('btn-export').addEventListener('click', exportData);
        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', importData);

        // Records
        document.getElementById('select-records-course').addEventListener('change', onRecordsFilterChange);
        document.getElementById('select-records-player').addEventListener('change', onRecordsFilterChange);

        // Course management
        document.getElementById('btn-add-course').addEventListener('click', () => showCourseEditScreen(null));
        document.getElementById('form-course').addEventListener('submit', saveCourse);
        document.getElementById('btn-add-hole').addEventListener('click', addHoleRow);
        document.getElementById('btn-delete-course').addEventListener('click', deleteCourse);

        // New game
        document.getElementById('btn-add-player').addEventListener('click', addPlayerRow);
        document.getElementById('form-new-game').addEventListener('submit', startGame);

        // Game screen
        document.getElementById('btn-prev-hole').addEventListener('click', () => navigateHole(-1));
        document.getElementById('btn-next-hole').addEventListener('click', () => navigateHole(1));
        document.getElementById('btn-finish-game').addEventListener('click', finishGame);
    }

    // ==================== COURSES ====================
    async function showCoursesScreen() {
        const courses = await Storage.Courses.getAll();
        const $list = document.getElementById('courses-list');

        if (courses.length === 0) {
            $list.innerHTML = '<div class="list-empty">Aucun parcours. Créez-en un !</div>';
        } else {
            $list.innerHTML = courses.map(course => `
                <div class="list-item" data-id="${course.id}">
                    <div class="list-item-title">${escapeHtml(course.name)}</div>
                    <div class="list-item-subtitle">${course.holes.length} trous - Par ${course.holes.reduce((sum, h) => sum + h.par, 0)}</div>
                </div>
            `).join('');

            $list.querySelectorAll('.list-item').forEach(item => {
                item.addEventListener('click', () => {
                    const courseId = item.dataset.id;
                    showCourseEditScreen(courseId);
                });
            });
        }

        showScreen('courses');
    }

    async function showCourseEditScreen(courseId) {
        const $form = document.getElementById('form-course');
        const $name = document.getElementById('course-name');
        const $holesContainer = document.getElementById('holes-container');
        const $deleteBtn = document.getElementById('btn-delete-course');

        $form.reset();
        $holesContainer.innerHTML = '';

        if (courseId) {
            currentCourse = await Storage.Courses.getById(courseId);
            $name.value = currentCourse.name;
            currentCourse.holes.forEach(hole => {
                addHoleRow(null, hole.number, hole.par);
            });
            $deleteBtn.classList.remove('hidden');
        } else {
            currentCourse = null;
            // Add 9 default holes
            for (let i = 1; i <= 9; i++) {
                addHoleRow(null, i, 3);
            }
            $deleteBtn.classList.add('hidden');
        }

        showScreen('course-edit');
    }

    function addHoleRow(event, number = null, par = 3) {
        const $container = document.getElementById('holes-container');
        const holeNumber = number || ($container.children.length + 1);

        const $row = document.createElement('div');
        $row.className = 'hole-row';
        $row.innerHTML = `
            <span>Trou ${holeNumber}</span>
            <label>Par:</label>
            <input type="number" value="${par}" min="1" max="10" data-hole="${holeNumber}">
            <button type="button" aria-label="Supprimer">×</button>
        `;

        $row.querySelector('button').addEventListener('click', () => {
            $row.remove();
            renumberHoles();
        });

        $container.appendChild($row);
    }

    function renumberHoles() {
        const $rows = document.querySelectorAll('#holes-container .hole-row');
        $rows.forEach((row, index) => {
            row.querySelector('span').textContent = `Trou ${index + 1}`;
            row.querySelector('input').dataset.hole = index + 1;
        });
    }

    async function saveCourse(event) {
        event.preventDefault();

        const name = document.getElementById('course-name').value.trim();
        const $holeInputs = document.querySelectorAll('#holes-container input');
        
        const holes = Array.from($holeInputs).map((input, index) => ({
            number: index + 1,
            par: parseInt(input.value) || 3
        }));

        if (holes.length === 0) {
            alert('Ajoutez au moins un trou !');
            return;
        }

        const course = {
            id: currentCourse?.id,
            name: name,
            holes: holes
        };

        await Storage.Courses.save(course);
        goBack();
    }

    async function deleteCourse() {
        if (!currentCourse) return;
        
        if (confirm(`Supprimer le parcours "${currentCourse.name}" ?`)) {
            await Storage.Courses.delete(currentCourse.id);
            goBack();
        }
    }

    // ==================== NEW GAME ====================
    async function showNewGameScreen() {
        const courses = await Storage.Courses.getAll();
        const $select = document.getElementById('select-course');
        const $playersContainer = document.getElementById('players-container');

        // Populate courses dropdown
        $select.innerHTML = '<option value="">-- Choisir un parcours --</option>' +
            courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

        // Clear and add default player inputs
        $playersContainer.innerHTML = '';
        addPlayerRow();
        addPlayerRow();

        showScreen('new-game');
    }

    function addPlayerRow(event, name = '') {
        const $container = document.getElementById('players-container');
        const $row = document.createElement('div');
        $row.className = 'player-input-row';
        $row.innerHTML = `
            <input type="text" placeholder="Nom du joueur" value="${escapeHtml(name)}" required>
            <button type="button" aria-label="Supprimer">×</button>
        `;

        $row.querySelector('button').addEventListener('click', () => {
            if ($container.children.length > 1) {
                $row.remove();
            }
        });

        $container.appendChild($row);
    }

    async function startGame(event) {
        event.preventDefault();

        const courseId = document.getElementById('select-course').value;
        if (!courseId) {
            alert('Sélectionnez un parcours !');
            return;
        }

        const $playerInputs = document.querySelectorAll('#players-container input');
        const players = Array.from($playerInputs)
            .map(input => input.value.trim())
            .filter(name => name.length > 0);

        if (players.length < 1) {
            alert('Ajoutez au moins un joueur !');
            return;
        }

        // Check for duplicate names
        if (new Set(players).size !== players.length) {
            alert('Les noms des joueurs doivent être uniques !');
            return;
        }

        const course = await Storage.Courses.getById(courseId);

        // Initialize scores with null for each hole (not yet played)
        const scores = {};
        players.forEach(player => {
            scores[player] = new Array(course.holes.length).fill(null);
        });

        const game = {
            courseId: courseId,
            courseName: course.name,
            courseHoles: course.holes,
            date: new Date().toISOString(),
            players: players,
            scores: scores,
            finished: false
        };

        currentGame = await Storage.Games.save(game);
        currentHoleIndex = 0;
        
        await checkForCurrentGame();
        screenHistory = ['home'];
        showGameScreen();
    }

    // ==================== GAME SCREEN ====================
    async function resumeGame() {
        currentGame = await Storage.Games.getCurrent();
        if (currentGame) {
            currentHoleIndex = findFirstIncompleteHole();
            screenHistory = ['home'];
            showGameScreen();
        }
    }

    function findFirstIncompleteHole() {
        if (!currentGame) return 0;
        
        for (let i = 0; i < currentGame.courseHoles.length; i++) {
            for (const player of currentGame.players) {
                if (currentGame.scores[player][i] === null) {
                    return i;
                }
            }
        }
        return currentGame.courseHoles.length - 1;
    }

    function showGameScreen() {
        showScreen('game');
        renderGameInfo();
        renderScorecard();
        renderCurrentHolePanel();
        updateFinishButton();
    }

    function renderGameInfo() {
        const $info = document.getElementById('game-current-info');
        const date = new Date(currentGame.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        $info.innerHTML = `
            <p><strong>${escapeHtml(currentGame.courseName)}</strong> — ${date}</p>
        `;
    }

    function renderScorecard() {
        const $header = document.getElementById('scorecard-header');
        const $body = document.getElementById('scorecard-body');
        const $footer = document.getElementById('scorecard-footer');

        const holes = currentGame.courseHoles;
        const players = currentGame.players;
        const scores = currentGame.scores;

        // Header row: Player | 1 | 2 | 3 | ... | Total
        $header.innerHTML = `
            <tr>
                <th>Joueur</th>
                ${holes.map((h, i) => `<th class="${i === currentHoleIndex ? 'current-hole-cell' : ''}">${h.number}</th>`).join('')}
                <th>Total</th>
            </tr>
            <tr>
                <th>Par</th>
                ${holes.map((h, i) => `<th class="${i === currentHoleIndex ? 'current-hole-cell' : ''}">${h.par}</th>`).join('')}
                <th>${holes.reduce((sum, h) => sum + h.par, 0)}</th>
            </tr>
        `;

        // Body: one row per player
        $body.innerHTML = players.map(player => {
            const playerScores = scores[player];
            const total = playerScores.reduce((sum, s) => sum + (s ?? 0), 0);
            
            return `
                <tr>
                    <td>${escapeHtml(player)}</td>
                    ${playerScores.map((score, i) => {
                        const displayScore = formatScore(score);
                        const scoreClass = getScoreClass(score);
                        const currentClass = i === currentHoleIndex ? 'current-hole-cell' : '';
                        return `<td class="score-cell ${scoreClass} ${currentClass}" data-player="${escapeHtml(player)}" data-hole="${i}">${displayScore}</td>`;
                    }).join('')}
                    <td class="${getScoreClass(total)}">${formatScore(total)}</td>
                </tr>
            `;
        }).join('');

        // Add click handlers for score cells
        $body.querySelectorAll('.score-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const holeIndex = parseInt(cell.dataset.hole);
                currentHoleIndex = holeIndex;
                renderScorecard();
                renderCurrentHolePanel();
            });
        });

        // Footer is empty for now (could add stats)
        $footer.innerHTML = '';
    }

    function renderCurrentHolePanel() {
        const hole = currentGame.courseHoles[currentHoleIndex];
        const $holeNumber = document.getElementById('current-hole-number');
        const $holePar = document.getElementById('current-hole-par');
        const $scoreInputs = document.getElementById('score-inputs');
        const $prevBtn = document.getElementById('btn-prev-hole');
        const $nextBtn = document.getElementById('btn-next-hole');

        $holeNumber.textContent = hole.number;
        $holePar.textContent = hole.par;

        // Score inputs for each player
        $scoreInputs.innerHTML = currentGame.players.map(player => {
            const score = currentGame.scores[player][currentHoleIndex] ?? 0;
            return `
                <div class="score-input-row">
                    <span class="player-name">${escapeHtml(player)}</span>
                    <div class="score-controls">
                        <button type="button" data-player="${escapeHtml(player)}" data-delta="-1">−</button>
                        <span class="score-value ${getScoreClass(score)}">${formatScore(score)}</span>
                        <button type="button" data-player="${escapeHtml(player)}" data-delta="+1">+</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for score buttons
        $scoreInputs.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const player = btn.dataset.player;
                const delta = parseInt(btn.dataset.delta);
                updateScore(player, delta);
            });
        });

        // Navigation buttons
        $prevBtn.disabled = currentHoleIndex === 0;
        
        const isLastHole = currentHoleIndex === currentGame.courseHoles.length - 1;
        $nextBtn.textContent = isLastHole ? 'Valider ✓' : 'Suivant →';
        $nextBtn.disabled = false;
    }

    function updateScore(player, delta) {
        const currentScore = currentGame.scores[player][currentHoleIndex] ?? 0;
        const newScore = currentScore + delta;
        
        // Limit score range (e.g., -5 to +10)
        if (newScore < -5 || newScore > 10) return;

        currentGame.scores[player][currentHoleIndex] = newScore;
        Storage.Games.save(currentGame);

        // Update display
        const $scoreValue = document.querySelector(`.score-input-row button[data-player="${player}"]`)
            .parentElement.querySelector('.score-value');
        $scoreValue.textContent = formatScore(newScore);
        $scoreValue.className = `score-value ${getScoreClass(newScore)}`;

        renderScorecard();
    }

    function navigateHole(delta) {
        // When moving forward (or validating last hole), set any null scores to 0 for current hole
        if (delta > 0) {
            for (const player of currentGame.players) {
                if (currentGame.scores[player][currentHoleIndex] === null) {
                    currentGame.scores[player][currentHoleIndex] = 0;
                }
            }
            Storage.Games.save(currentGame);
        }
        
        const newIndex = currentHoleIndex + delta;
        if (newIndex >= 0 && newIndex < currentGame.courseHoles.length) {
            currentHoleIndex = newIndex;
            renderScorecard();
            renderCurrentHolePanel();
        } else if (delta > 0) {
            // Last hole validated, just refresh display
            renderScorecard();
            renderCurrentHolePanel();
        }
        updateFinishButton();
    }

    async function finishGame() {
        currentGame.finished = true;
        await Storage.Games.save(currentGame);
        currentGame = null;
        
        await checkForCurrentGame();
        screenHistory = [];
        showScreen('home');
        
        // Proposer l'export après la partie
        setTimeout(() => {
            if (confirm('Partie terminée ! 🎉\n\nVoulez-vous exporter vos données pour les sauvegarder ?')) {
                exportData();
            }
        }, 500);
    }

    function checkAllScoresEntered() {
        for (const player of currentGame.players) {
            for (const score of currentGame.scores[player]) {
                if (score === null) {
                    return false;
                }
            }
        }
        return true;
    }

    function updateFinishButton() {
        const $btn = document.getElementById('btn-finish-game');
        $btn.disabled = !checkAllScoresEntered();
    }

    // ==================== HISTORY ====================
    async function showHistoryScreen() {
        const games = await Storage.Games.getFinished();
        const $list = document.getElementById('history-list');

        if (games.length === 0) {
            $list.innerHTML = '<div class="list-empty">Aucune partie terminée.</div>';
        } else {
            $list.innerHTML = games.map(game => {
                const date = new Date(game.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                
                // Calculate winner
                const totals = game.players.map(player => ({
                    name: player,
                    total: game.scores[player].reduce((sum, s) => sum + (s ?? 0), 0)
                }));
                totals.sort((a, b) => a.total - b.total);
                const winner = totals[0];

                return `
                    <div class="list-item history-item" data-id="${game.id}">
                        <div class="list-item-content">
                            <div class="list-item-title">${escapeHtml(game.courseName)}</div>
                            <div class="list-item-subtitle">
                                ${date} — 🏆 ${escapeHtml(winner.name)} (${formatScore(winner.total)})
                            </div>
                            <div class="list-item-players">
                                ${game.players.map(escapeHtml).join(', ')}
                            </div>
                        </div>
                        <button class="btn-delete-game" data-id="${game.id}" aria-label="Supprimer">🗑️</button>
                    </div>
                `;
            }).join('');

            $list.querySelectorAll('.list-item-content').forEach(content => {
                content.addEventListener('click', () => {
                    const gameId = content.parentElement.dataset.id;
                    showGameDetailScreen(gameId);
                });
            });

            $list.querySelectorAll('.btn-delete-game').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const gameId = btn.dataset.id;
                    if (confirm('Supprimer cette partie ?')) {
                        await Storage.Games.delete(gameId);
                        showHistoryScreen();
                    }
                });
            });
        }

        showScreen('history');
    }

    async function showGameDetailScreen(gameId) {
        const game = await Storage.Games.getById(gameId);
        if (!game) return;

        const $info = document.getElementById('game-detail-info');
        const $header = document.getElementById('game-detail-header');
        const $body = document.getElementById('game-detail-body');
        const $footer = document.getElementById('game-detail-footer');

        const dateFormatted = new Date(game.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Date en format ISO pour l'input date
        const dateISO = new Date(game.date).toISOString().slice(0, 10);

        // Info section
        $info.innerHTML = `
            <p><strong>Parcours:</strong> ${escapeHtml(game.courseName)}</p>
            <p><strong>Date:</strong> ${dateFormatted} <button id="btn-change-date" class="btn-inline" data-id="${game.id}" data-date="${dateISO}">✏️</button></p>
            <p><strong>Joueurs:</strong> ${game.players.map(escapeHtml).join(', ')}</p>
        `;

        // Event listener pour changer la date
        document.getElementById('btn-change-date').addEventListener('click', async (e) => {
            const currentDate = e.target.dataset.date;
            const newDate = prompt('Nouvelle date (AAAA-MM-JJ) :', currentDate);
            if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                game.date = new Date(newDate + 'T12:00:00').toISOString();
                await Storage.Games.save(game);
                showGameDetailScreen(game.id);
            } else if (newDate) {
                alert('Format invalide. Utilisez AAAA-MM-JJ (ex: 2026-08-07)');
            }
        });

        const holes = game.courseHoles;
        const players = game.players;
        const scores = game.scores;

        // Header
        $header.innerHTML = `
            <tr>
                <th>Joueur</th>
                ${holes.map(h => `<th>${h.number}</th>`).join('')}
                <th>Total</th>
            </tr>
            <tr>
                <th>Par</th>
                ${holes.map(h => `<th>${h.par}</th>`).join('')}
                <th>${holes.reduce((sum, h) => sum + h.par, 0)}</th>
            </tr>
        `;

        // Body
        const playerTotals = players.map(player => ({
            name: player,
            total: scores[player].reduce((sum, s) => sum + (s ?? 0), 0)
        }));
        playerTotals.sort((a, b) => a.total - b.total);

        $body.innerHTML = players.map(player => {
            const playerScores = scores[player];
            const total = playerScores.reduce((sum, s) => sum + (s ?? 0), 0);
            const isWinner = player === playerTotals[0].name;
            
            return `
                <tr>
                    <td>${isWinner ? '🏆 ' : ''}${escapeHtml(player)}</td>
                    ${playerScores.map(score => {
                        const displayScore = formatScore(score);
                        const scoreClass = getScoreClass(score);
                        return `<td class="${scoreClass}">${displayScore}</td>`;
                    }).join('')}
                    <td class="${getScoreClass(total)}"><strong>${formatScore(total)}</strong></td>
                </tr>
            `;
        }).join('');

        $footer.innerHTML = '';

        // Event listener pour export PNG
        document.getElementById('btn-export-png').onclick = () => exportGameAsPng(game);

        showScreen('game-detail');
    }

    async function exportGameAsPng(game) {
        const container = document.getElementById('game-detail-container');
        
        try {
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 2, // Meilleure qualité
                logging: false
            });
            
            // Convertir en blob et télécharger
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date(game.date).toISOString().slice(0, 10);
                a.href = url;
                a.download = `footgolf-${game.courseName}-${dateStr}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            alert('Erreur lors de l\'export : ' + error.message);
        }
    }

    // ==================== RECORDS ====================
    async function showRecordsScreen() {
        const courses = await Storage.Courses.getAll();
        const players = await Storage.Games.getAllPlayers();
        const $selectCourse = document.getElementById('select-records-course');
        const $selectPlayer = document.getElementById('select-records-player');
        const $container = document.getElementById('records-container');

        $selectCourse.innerHTML = '<option value="">-- Sélectionner --</option>' +
            courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        
        $selectPlayer.innerHTML = '<option value="">-- Tous les joueurs --</option>' +
            players.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        
        $container.classList.add('hidden');
        showScreen('records');
    }

    async function onRecordsFilterChange() {
        const courseId = document.getElementById('select-records-course').value;
        const playerName = document.getElementById('select-records-player').value;
        await showRecordsForCourse(courseId, playerName);
    }

    async function showRecordsForCourse(courseId, playerFilter = '') {
        const $container = document.getElementById('records-container');
        const $global = document.getElementById('records-global');
        const $ranking = document.getElementById('records-ranking');
        const $byHole = document.getElementById('records-by-hole');
        const $gamesList = document.getElementById('records-games-list');

        if (!courseId) {
            $container.classList.add('hidden');
            return;
        }

        const course = await Storage.Courses.getById(courseId);
        const allGames = await Storage.Games.getFinished();
        const games = allGames.filter(g => g.courseId === courseId);

        if (games.length === 0) {
            $global.innerHTML = '<p>Aucune partie sur ce parcours.</p>';
            $ranking.innerHTML = '';
            $byHole.innerHTML = '';
            $gamesList.innerHTML = '';
            $container.classList.remove('hidden');
            return;
        }

        // Filtrer par joueur si sélectionné
        const filteredGames = playerFilter 
            ? games.filter(g => g.players.includes(playerFilter))
            : games;

        if (filteredGames.length === 0) {
            $global.innerHTML = '<p>Aucune partie pour ce joueur sur ce parcours.</p>';
            $ranking.innerHTML = '';
            $byHole.innerHTML = '';
            $gamesList.innerHTML = '';
            $container.classList.remove('hidden');
            return;
        }

        // Section Global
        let nbGames = filteredGames.length;
        let nbWins = 0;
        
        filteredGames.forEach(game => {
            const totals = game.players.map(p => ({
                name: p,
                total: game.scores[p].reduce((sum, s) => sum + (s ?? 0), 0)
            }));
            totals.sort((a, b) => a.total - b.total);
            
            if (playerFilter) {
                if (totals[0].name === playerFilter) nbWins++;
            }
        });

        if (playerFilter) {
            $global.innerHTML = `
                <p><span>Parties jouées</span><strong>${nbGames}</strong></p>
                <p><span>Victoires</span><strong>${nbWins}</strong></p>
            `;
        } else {
            $global.innerHTML = `
                <p><span>Parties jouées</span><strong>${nbGames}</strong></p>
            `;
        }

        // Classement meilleurs scores totaux
        const allScores = [];
        filteredGames.forEach(game => {
            const playersToInclude = playerFilter ? [playerFilter] : game.players;
            playersToInclude.forEach(player => {
                if (game.scores[player]) {
                    const total = game.scores[player].reduce((sum, s) => sum + (s ?? 0), 0);
                    allScores.push({
                        player,
                        total,
                        date: game.date,
                        gameId: game.id
                    });
                }
            });
        });

        allScores.sort((a, b) => a.total - b.total || new Date(b.date) - new Date(a.date));
        const top10 = allScores.slice(0, 10);

        // Calcul des rangs avec égalités
        let currentRank = 1;
        let previousTotal = null;
        const rankedScores = top10.map((entry, index) => {
            if (previousTotal !== null && entry.total > previousTotal) {
                currentRank = index + 1;
            }
            previousTotal = entry.total;
            return { ...entry, rank: currentRank };
        });

        $ranking.innerHTML = rankedScores.map(entry => {
            const date = new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
            const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
            const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`;

            return `
                <div class="record-item">
                    <span class="record-rank ${rankClass}">${medal}</span>
                    <div class="record-item-left">
                        <span class="record-player">${escapeHtml(entry.player)}</span>
                        <span class="record-date">${date}</span>
                    </div>
                    <span class="record-score ${getScoreClass(entry.total)}">${formatScore(entry.total)}</span>
                </div>
            `;
        }).join('');

        // Records par trou (avec moyenne si joueur filtré)
        const holeRecords = [];
        for (let i = 0; i < course.holes.length; i++) {
            const hole = course.holes[i];
            const playerBestByHole = new Map();
            let sumScores = 0;
            let countScores = 0;

            filteredGames.forEach(game => {
                const playersToInclude = playerFilter ? [playerFilter] : game.players;
                playersToInclude.forEach(player => {
                    if (game.scores[player]) {
                        const score = game.scores[player][i];
                        if (score !== null) {
                            // Pour la moyenne (uniquement si joueur filtré)
                            if (playerFilter) {
                                sumScores += score;
                                countScores++;
                            }
                            
                            const existing = playerBestByHole.get(player);
                            if (existing && score === existing.bestScore) {
                                // Même score, mettre à jour avec la date la plus récente
                                if (new Date(game.date) > new Date(existing.latestDate)) {
                                    playerBestByHole.set(player, { bestScore: score, latestDate: game.date });
                                }
                            } else if (!existing || score < existing.bestScore) {
                                playerBestByHole.set(player, { bestScore: score, latestDate: game.date });
                            }
                        }
                    }
                });
            });

            // Trouver le meilleur score global pour ce trou
            let bestScore = null;
            let bestPlayers = [];
            playerBestByHole.forEach((data, player) => {
                if (bestScore === null || data.bestScore < bestScore) {
                    bestScore = data.bestScore;
                    bestPlayers = [{ player, date: data.latestDate }];
                } else if (data.bestScore === bestScore) {
                    bestPlayers.push({ player, date: data.latestDate });
                }
            });

            const avgScore = countScores > 0 ? (sumScores / countScores) : null;

            holeRecords.push({
                hole: hole.number,
                par: hole.par,
                bestScore,
                bestPlayers,
                avgScore
            });
        }

        $byHole.innerHTML = holeRecords.map(record => {
            if (record.bestScore === null) {
                return `
                    <div class="record-item">
                        <div class="record-item-left">
                            <span class="record-hole">Trou ${record.hole} (Par ${record.par})</span>
                            <span class="record-date">Aucun record</span>
                        </div>
                        <span class="record-score">-</span>
                    </div>
                `;
            }
            const playersStr = record.bestPlayers.map(p => {
                const date = new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                return `${escapeHtml(p.player)} (${date})`;
            }).join(', ');

            const avgDisplay = playerFilter && record.avgScore !== null 
                ? ` | Moy: ${record.avgScore >= 0 ? '+' : ''}${record.avgScore.toFixed(1)}`
                : '';

            return `
                <div class="record-item">
                    <div class="record-item-left">
                        <span class="record-hole">Trou ${record.hole} (Par ${record.par})</span>
                        <span class="record-date">${playersStr}</span>
                    </div>
                    <span class="record-score">Score: <span class="${getScoreClass(record.bestScore)}">${formatScore(record.bestScore)}</span>${avgDisplay}</span>
                </div>
            `;
        }).join('');

        // Historique des parties
        const gamesToShow = playerFilter 
            ? filteredGames.map(game => ({
                game,
                total: game.scores[playerFilter].reduce((sum, s) => sum + (s ?? 0), 0)
            }))
            : filteredGames.map(game => {
                const totals = game.players.map(p => ({
                    name: p,
                    total: game.scores[p].reduce((sum, s) => sum + (s ?? 0), 0)
                }));
                totals.sort((a, b) => a.total - b.total);
                return { game, winner: totals[0] };
            });

        gamesToShow.sort((a, b) => new Date(b.game.date) - new Date(a.game.date));

        $gamesList.innerHTML = gamesToShow.map(entry => {
            const date = new Date(entry.game.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            if (playerFilter) {
                return `
                    <div class="list-item" data-id="${entry.game.id}">
                        <div class="list-item-title">${date} — Score: <span class="${getScoreClass(entry.total)}">${formatScore(entry.total)}</span></div>
                    </div>
                `;
            } else {
                return `
                    <div class="list-item" data-id="${entry.game.id}">
                        <div class="list-item-title">${date} — 🏆 ${escapeHtml(entry.winner.name)} (${formatScore(entry.winner.total)})</div>
                        <div class="list-item-players">${entry.game.players.map(escapeHtml).join(', ')}</div>
                    </div>
                `;
            }
        }).join('');

        // Click sur une partie pour voir le détail
        $gamesList.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => {
                showGameDetailScreen(item.dataset.id);
            });
        });

        $container.classList.remove('hidden');
    }

    // ==================== HELPERS ====================
    function formatScore(score) {
        if (score === null) return '-';
        if (score === 0) return '0';
        return score > 0 ? `+${score}` : `${score}`;
    }

    function getScoreClass(score) {
        if (score === null) return '';
        if (score < 0) return 'score-negative';
        if (score > 0) return 'score-positive';
        return 'score-zero';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== EXPORT / IMPORT ====================
    async function exportData() {
        const courses = await Storage.Courses.getAll();
        const games = await Storage.Games.getAll();

        const data = {
            version: 1,
            exportDate: new Date().toISOString(),
            courses: courses,
            games: games
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().slice(0, 10);
        const filename = `footgolf-backup-${date}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        alert(`Données exportées dans ${filename}`);
    }

    async function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Importer ce fichier remplacera toutes vos données actuelles. Continuer ?')) {
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.courses || !data.games) {
                throw new Error('Format de fichier invalide');
            }

            // Clear existing data and import
            const existingCourses = await Storage.Courses.getAll();
            const existingGames = await Storage.Games.getAll();

            for (const course of existingCourses) {
                await Storage.Courses.delete(course.id);
            }
            for (const game of existingGames) {
                await Storage.Games.delete(game.id);
            }

            // Import new data
            for (const course of data.courses) {
                await Storage.Courses.save(course);
            }
            for (const game of data.games) {
                await Storage.Games.save(game);
            }

            await checkForCurrentGame();
            alert(`Import réussi : ${data.courses.length} parcours, ${data.games.length} parties`);
            showScreen('home');

        } catch (error) {
            alert('Erreur lors de l\'import : ' + error.message);
        }

        event.target.value = '';
    }

    // Public API
    return { init };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
