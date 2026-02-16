document.addEventListener('DOMContentLoaded', async () => {
    console.log('✓ Application démarrée');

    try {
        // Charger les ressources
        await resourceManager.loadResources();

        // Initialiser le jeu
        const gameInitialized = game.initialize('gameCanvas');
        if (!gameInitialized) {
            console.error('Impossible d\'initialiser le jeu');
            return;
        }

        // Initialiser la détection de gestes
        const gesturesInitialized = await gestureRecognizer.initialize();
        if (!gesturesInitialized) {
            console.error('Détection de gestes non disponible');
        }

        // Écouter les gestes et les transmettre au jeu
        gestureRecognizer.onGesture((gesture) => {
            if (game.isRunning) {
                game.handleGesture(gesture);
            }
        });

        // Boutons de contrôle
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('🎮 Démarrage du jeu');
                game.start();
                startBtn.disabled = true;
                pauseBtn.disabled = false;  
                stopBtn.disabled = false;
                pauseBtn.textContent = '⏸ Pause';
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (game.isPaused) {
                    console.log('Reprise du jeu');
                    game.resume();
                    pauseBtn.textContent = '⏸ Pause';
                } else {
                    console.log('Mise en pause du jeu');
                    game.pause();
                    pauseBtn.textContent = '▶ Reprendre';
                }
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                console.log('Arrêt du jeu');
                
                const lastScoreEl = document.getElementById('lastScore');
                if (lastScoreEl) {
                    lastScoreEl.textContent = game.score;
                    localStorage.setItem('lastScore', game.score);
                }
                
                const bestScoreEl = document.getElementById('bestScore');
                let bestScore = parseInt(localStorage.getItem('bestScore') || '0');
                if (game.score > bestScore) {
                    bestScore = game.score;
                    localStorage.setItem('bestScore', bestScore);
                }
                if (bestScoreEl) {
                    bestScoreEl.textContent = bestScore;
                }
                
                game.stop();
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                pauseBtn.textContent = '⏸ Pause';
                stopBtn.disabled = true;
            });
        }

        // Charger les scores sauvegardés
        const bestScoreEl = document.getElementById('bestScore');
        const lastScoreEl = document.getElementById('lastScore');
        if (bestScoreEl) {
            bestScoreEl.textContent = localStorage.getItem('bestScore') || '0';
        }
        if (lastScoreEl) {
            lastScoreEl.textContent = localStorage.getItem('lastScore') || '0';
        }

        console.log('Application prête');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
});

window.addEventListener('beforeunload', () => {
    gestureRecognizer.stop();
    game.stop();
});