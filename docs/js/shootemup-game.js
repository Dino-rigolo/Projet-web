//Gestion du jeu 

class ShootemupGame {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.playerX = 0;
        this.playerY = 0;
        this.playerSpeed = 5;
        this.bullets = [];
        this.enemies = [];
        this.missiles = [];
        this.score = 0;
        this.lives = 3;
        this.shieldActive = false;
        this.shieldStartTime = 0;
        this.shieldCooldownStart = 0;
        this.lastFireTime = 0;
        this.fireRate = 200;
        this.canvas = null;
        this.ctx = null;
        this.lastDifficultyLevel = 0; 

        // Constantes du bouclier
        this.SHIELD_DURATION = 3000;
        this.SHIELD_COOLDOWN = 10000;

        // Animation du vaisseau
        this.playerAnimFrame = 0;
        this.playerAnimCounter = 0;
        this.playerAnimFrames = [0, 1, 2];
    }

    initialize(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas non trouvé avec l\'ID:', canvasId);
            return false;
        }

        this.ctx = this.canvas.getContext('2d');
        return true;
    }

    start() {
        this.isRunning = true;
        this.score = 0;
        this.lives = 3;
        this.bullets = [];
        this.enemies = [];
        this.missiles = []; 
        
        // la position du vaisseau 
        this.playerX = this.canvas.width / 2 - 25;
        this.playerY = this.canvas.height - 100;
        
        // Démarrer la musique de fond
        resourceManager.playSoundtrack();
        
        // Mettre à jour l'affichage des cœurs
        this.updateLivesDisplay();
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        resourceManager.pauseSoundtrack();
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            resourceManager.pauseSoundtrack();
        }
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            resourceManager.continueSoundtrack();  
            this.gameLoop();
        }
    }

    handleGesture(gesture) {
        if (!this.isRunning) return;

        switch (gesture) {
            case 'UP':
                this.fire();
                break;
            case 'TWO_HANDS_OPEN':
                this.activateShield();
                break;
            case 'DOWN':
                break;
        }
    }

    fire() {
        const now = Date.now();
        if (now - this.lastFireTime > this.fireRate) {
            this.bullets.push({
                x: this.playerX + 22.5, 
                y: this.playerY,
                width: 5,  
                height: 15,
                speed: 7
            });
            resourceManager.playSound('laser', 0.2);
            this.lastFireTime = now;
        }
    }

    activateShield() {
        if (this.canActivateShield()) {
            this.shieldActive = true;
            this.shieldStartTime = Date.now();
            resourceManager.playSound('powerup', 0.8);
        }
    }

    canActivateShield() {
        const now = Date.now();
        const cooldownElapsed = now - this.shieldCooldownStart;
        return !this.shieldActive && cooldownElapsed >= this.SHIELD_COOLDOWN;
    }

    calculateDifficulty() {
        // À partir de 150 points, la difficulté augmente tous les 50 points
        if (this.score < 150) {
            return {
                greenEnemyProba: 0,    
                redEnemySpeed: 2,
                greenEnemySpeed: 0.8,   
                baseSpawnRate: 0.02
            };
        }
        
        const scoreAbove150 = this.score - 150;
        const levelUp = Math.floor(scoreAbove150 / 50);
        
   
        if (levelUp === 4) {  
            return {
                greenEnemyProba: 0.5,    
                redEnemySpeed: 20,       
                greenEnemySpeed: 10,     
                baseSpawnRate: 0.02
            };
        }
        
        // À partir du niveau 6, les vitesses ne augmentent plus, mélange 50/50 de rouges et verts
        if (levelUp >= 5) {  
            return {
                greenEnemyProba: 0.5,    
                redEnemySpeed: 25,       
                greenEnemySpeed: 10,     
                baseSpawnRate: 0.02 + (levelUp - 5) * 0.005  
            };
        }
        
        // Niveaux 1-4 : augmentation progressive des rouges, verts x2 chaque niveau
        return {
            greenEnemyProba: Math.min(0.1 * (levelUp + 1), 1.0),     
            redEnemySpeed: 2 * Math.pow(2, levelUp),                 
            greenEnemySpeed: 0.8 * Math.pow(2, levelUp),            
            baseSpawnRate: 0.02
        };
    }

    checkDifficultyLevelUp() {
        const difficulty = this.calculateDifficulty();
        const currentLevel = Math.floor((this.score - 150) / 50);
        
        if (this.score >= 150 && currentLevel > this.lastDifficultyLevel) {
            this.lastDifficultyLevel = currentLevel;
        }
    }

    gameLoop() {
        if (!this.isRunning) return;
        if (this.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }

        // Mettre à jour le déplacement basé sur le geste actuel
        const currentGesture = gestureRecognizer.getCurrentGesture();
        if (currentGesture === 'LEFT') {
            this.playerX = Math.max(0, this.playerX - this.playerSpeed * 1.5);  
        } else if (currentGesture === 'RIGHT') {
            this.playerX = Math.min(this.canvas.width - 50, this.playerX + this.playerSpeed * 1.5);  
        }
        
        // Tirs continus quand le geste UP est actif
        if (currentGesture === 'UP') {
            this.fire();
        }

        // Nettoyer le canvas avec dégradé
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(10, 10, 30, 0.3)');
        gradient.addColorStop(1, 'rgba(20, 20, 60, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Mettre à jour et dessiner
        this.updateBullets();
        this.updateEnemies();
        this.updateMissiles(); 
        this.updateShield();
        this.drawPlayer();
        this.drawBullets();
        this.drawEnemies();
        this.drawMissiles();  
        
        // Mettre à jour et dessiner les explosions
        resourceManager.updateAndDrawExplosions(this.ctx);
        
        this.drawUI();
        
        // Mettre à jour l'affichage du score en bas
        const scoreDisplay = document.getElementById('gameScore');
        if (scoreDisplay) {
            scoreDisplay.textContent = this.score;
        }

        // Spawn ennemis avec fréquence variable selon la difficulté
        const difficulty = this.calculateDifficulty();
        if (Math.random() < difficulty.baseSpawnRate) {
            this.spawnEnemy();
        }
        
        // Vérifier si la difficulté doit augmenter
        this.checkDifficultyLevelUp();
        
        // Ennemis verts tirent des missiles
        for (let enemy of this.enemies) {
            if (enemy.type === 1) { 
                const now = Date.now();
                if (now - enemy.lastFireTime > 1500) {  
                    this.enemyFire(enemy);
                    enemy.lastFireTime = now;
                }
            }
        }

        // Collision
        this.checkCollisions();

        // Game over
        if (this.lives <= 0) {
            this.isRunning = false;
            resourceManager.pauseSoundtrack();
            resourceManager.playSound('gameOver', 0.5);
            
            // Désactiver les boutons pause et arrêter
            const pauseBtn = document.getElementById('pauseBtn');
            const stopBtn = document.getElementById('stopBtn');
            const startBtn = document.getElementById('startBtn');
            if (pauseBtn) pauseBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = true;
            if (startBtn) startBtn.disabled = false;  
            
            // Sauvegarder le score
            const bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
            if (this.score > bestScore) {
                localStorage.setItem('bestScore', this.score);
                document.getElementById('bestScore').textContent = this.score;
            }
            localStorage.setItem('lastScore', this.score);
            document.getElementById('lastScore').textContent = this.score;
            
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            this.ctx.font = 'bold 60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.shadowColor = 'transparent';
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].y -= this.bullets[i].speed;
            if (this.bullets[i].y < 0) {
                this.bullets.splice(i, 1);
            }
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].y += this.enemies[i].speed;
            if (this.enemies[i].y > this.canvas.height) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updateMissiles() {
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            this.missiles[i].y += this.missiles[i].speed;  // Descend vers le bas
            if (this.missiles[i].y > this.canvas.height) {
                this.missiles.splice(i, 1);
            }
        }
    }

    drawMissiles() {
        const rocketImg = resourceManager.getImage('rocket');
        if (!rocketImg) {
            // Fallback missile
            this.ctx.fillStyle = '#FF6600';
            for (let missile of this.missiles) {
                this.ctx.fillRect(missile.x - 10, missile.y - 27, 20, 54);
            }
            return;
        }

        for (let missile of this.missiles) {
            try {
                const spriteX = 0;
                const spriteY = 0;
                const spriteWidth = 15;
                const spriteHeight = 32;
                
                // Affichage à taille 20x54 (rectangle vertical fin)
                const displayX = missile.x - 10;
                const displayY = missile.y - 27;
                const displayWidth = 20;
                const displayHeight = 54;

                this.ctx.save();
                
                // Flip vertical autour du centre
                this.ctx.translate(displayX + displayWidth / 2, displayY + displayHeight / 2);
                this.ctx.scale(1, -1);
                this.ctx.translate(-(displayX + displayWidth / 2), -(displayY + displayHeight / 2));
                
                // Dessiner l'image directement
                this.ctx.drawImage(
                    rocketImg,
                    spriteX, spriteY, spriteWidth, spriteHeight,
                    displayX, displayY, displayWidth, displayHeight
                );
                
                this.ctx.restore();

                // Pas d'affichage de l'hitbox
            } catch (e) {
                // Fallback
                this.ctx.fillStyle = '#FF6600';
                this.ctx.fillRect(missile.x - 10, missile.y - 27, 20, 54);
            }
        }
    }

    updateShield() {
        if (this.shieldActive) {
            const now = Date.now();
            
            // Vérifier si le bouclier doit se désactiver
            if (now - this.shieldStartTime >= this.SHIELD_DURATION) {
                this.shieldActive = false;
                this.shieldCooldownStart = now;
                resourceManager.playSound('powerdown', 0.7);
            }
        }
    }

    drawPlayer() {
        const playerImg = resourceManager.getImage('player');

        if (playerImg) {
            try {
                this.ctx.save();
                
                // Translater au centre du vaisseau
                const centerX = this.playerX + 25;
                const centerY = this.playerY + 25;
                this.ctx.translate(centerX, centerY);
                
                // Tourner de 90 degrés pour pointer vers le haut
                this.ctx.rotate(-Math.PI / 2);
                
                // Dessiner l'image entière centrée
                this.ctx.drawImage(
                    playerImg,
                    -25, -25, 50, 50
                );
                
                this.ctx.restore();
            } catch (e) {
                this.drawPlayerFallback();
            }
        } else {
            this.drawPlayerFallback();
        }

        // Bouclier
        if (this.shieldActive) {
            this.ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(this.playerX + 25, this.playerY + 15, 50, 0, Math.PI * 2);
            this.ctx.stroke();

            // Animation pulse du bouclier
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            this.ctx.strokeStyle = `rgba(0, 255, 200, ${pulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.playerX + 25, this.playerY + 15, 55, 0, Math.PI * 2);
            this.ctx.stroke();

            // Texte durée
            const now = Date.now();
            const elapsed = now - this.shieldStartTime;
            const remaining = Math.max(0, (this.SHIELD_DURATION - elapsed) / 1000);
            this.ctx.fillStyle = '#00FFCC';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                '🛡️ ' + remaining.toFixed(1) + 's',
                this.playerX + 25,
                this.playerY - 15
            );
        } else {
            // Afficher le cooldown si en cours
            const now = Date.now();
            const cooldownElapsed = now - this.shieldCooldownStart;
            const cooldownRemaining = Math.max(0, (this.SHIELD_COOLDOWN - cooldownElapsed) / 1000);
            
            if (cooldownRemaining > 0) {
                this.ctx.fillStyle = 'rgba(255, 150, 0, 0.8)';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    '⏳ ' + cooldownRemaining.toFixed(1) + 's',
                    this.playerX + 25,
                    this.playerY - 15
                );
            }
        }
    }

    drawPlayerFallback() {
        // Vaisseau stylisé
        this.ctx.fillStyle = '#00FF00';
        this.ctx.beginPath();
        this.ctx.moveTo(this.playerX + 25, this.playerY); // Pointe avant
        this.ctx.lineTo(this.playerX + 50, this.playerY + 40); // Bas droit
        this.ctx.lineTo(this.playerX + 35, this.playerY + 30); // Réacteur droit
        this.ctx.lineTo(this.playerX + 25, this.playerY + 35); // Centre
        this.ctx.lineTo(this.playerX + 15, this.playerY + 30); // Réacteur gauche
        this.ctx.lineTo(this.playerX, this.playerY + 40); // Bas gauche
        this.ctx.closePath();
        this.ctx.fill();

        // Cockpit
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.beginPath();
        this.ctx.arc(this.playerX + 25, this.playerY + 15, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBullets() {
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
        this.ctx.shadowBlur = 10;

        for (let bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }

        this.ctx.shadowColor = 'transparent';
    }

    drawEnemies() {
        const enemyImg = resourceManager.getImage('enemy');
        const gameSheet = resourceManager.getImage('gameSheet');

        for (let enemy of this.enemies) {
            if (enemy.type === 0) {
                // Ennemi rouge
                if (enemyImg) {
                    try {
                        this.ctx.save();
                        
                        const centerX = enemy.x;
                        const centerY = enemy.y;
                        this.ctx.translate(centerX, centerY);
                        this.ctx.rotate(Math.PI / 2);
                        
                        this.ctx.drawImage(
                            enemyImg,
                            -25, -25, 50, 50
                        );
                        
                        this.ctx.restore();
                    } catch (e) {
                        this.drawEnemyFallback(enemy);
                    }
                } else {
                    this.drawEnemyFallback(enemy);
                }
            } else if (enemy.type === 1) {
                // Ennemi vert
                const enemyVertImg = resourceManager.getImage('enemyvert');
                if (enemyVertImg) {
                    try {
                        this.ctx.drawImage(
                            enemyVertImg,
                            enemy.x, enemy.y, 50, 50
                        );
                    } catch (e) {
                        this.drawEnemyFallback(enemy);
                    }
                } else {
                    this.drawEnemyFallback(enemy);
                }
            }
        }
    }

    drawEnemyFallback(enemy) {
        if (enemy.type === 1) {
            // Ennemi vert
            this.ctx.fillStyle = '#00FF44';
        } else {
            // Ennemi rouge
            this.ctx.fillStyle = '#FF4444';
        }
        this.ctx.beginPath();
        this.ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // Yeux
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        this.ctx.arc(enemy.x - 5, enemy.y - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(enemy.x + 5, enemy.y - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawUI() {
        // Afficher le niveau en haut à gauche
        let levelNum = 1;
        if (this.score >= 150) {
            levelNum = Math.floor((this.score - 150) / 50) + 2;
        }
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Niveau: ' + levelNum, 15, 30);

        // Geste actuel
        const gesture = gestureRecognizer.getCurrentGesture();
        if (gesture) {
            const gestureEmoji = {
                'UP': '👆',
                'DOWN': '👇',
                'LEFT': '👈',
                'RIGHT': '👉',
                'TWO_HANDS_OPEN': '✋✋'
            }[gesture] || '';
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${gestureEmoji} ${gesture}`, 15, 85);
        }

        // Statistiques de jeu
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('Ennemis: ' + this.enemies.length, this.canvas.width - 15, 30);
        this.ctx.fillText('Balles: ' + this.bullets.length, this.canvas.width - 15, 45);
        this.ctx.fillText('Missiles: ' + this.missiles.length, this.canvas.width - 15, 60);

        // Shield indicator
        if (this.shieldActive) {
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🛡️ BOUCLIER ACTIF', this.canvas.width / 2, 30);
        }
    }

    spawnEnemy() {
        const size = 50;
        const x = Math.random() * (this.canvas.width - size);
        const difficulty = this.calculateDifficulty();
        
        // Déterminer le type d'ennemi selon la difficulté
        const type = Math.random() < difficulty.greenEnemyProba ? 1 : 0;  
        
        this.enemies.push({
            x: x,
            y: -size,
            width: size,
            height: size,
            speed: type === 1 ? difficulty.greenEnemySpeed : difficulty.redEnemySpeed,  
            type: type,
            frame: 0,
            frameCounter: 0,
            lastFireTime: Date.now()
        });
    }

    enemyFire(enemy) {
        // Tirer un missile vers le bas avec une légère dispersion horizontale
        const difficulty = this.calculateDifficulty();
        const missileSpeed = difficulty.greenEnemySpeed * 3.5;  
        
        const dispersion = (Math.random() - 0.5) * 30;  
        this.missiles.push({
            x: enemy.x + 25 + dispersion,  
            y: enemy.y + 80,
            width: 10,
            height: 15,
            speed: missileSpeed,
            frame: 0
        });
        resourceManager.playSound('laser', 0.1);
    }

    checkCollisions() {
        // Bullet vs Enemy
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let enemyHitbox;
                if (this.enemies[j].type === 0) {
                    // Ennemi rouge: hitbox centrée
                    enemyHitbox = {
                        x: this.enemies[j].x - 25,
                        y: this.enemies[j].y - 25,
                        width: 50,
                        height: 50
                    };
                } else {
                    // Ennemi vert: hitbox normale
                    enemyHitbox = this.enemies[j];
                }

                if (this.isColliding(this.bullets[i], enemyHitbox)) {
                    const enemy = this.enemies[j];
                    
                    resourceManager.createExplosion(enemy.x, enemy.y);
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    
                    // Ennemis verts = 20 points, rouges = 10 points
                    this.score += enemy.type === 1 ? 20 : 10;
                    
                    resourceManager.playSound('explode', 0.3);
                    break;
                }
            }
        }

        // Bullet vs Missile
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.missiles.length - 1; j >= 0; j--) {
                if (this.isColliding(this.bullets[i], {
                    x: this.missiles[j].x - 10,
                    y: this.missiles[j].y - 27,
                    width: 20,
                    height: 54
                })) {
                    resourceManager.createExplosion(this.missiles[j].x, this.missiles[j].y);
                    this.bullets.splice(i, 1);
                    this.missiles.splice(j, 1);
                    this.score += 5; 
                    resourceManager.playSound('explode', 0.2);
                    break;
                }
            }
        }

        // Missile vs Player
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            if (this.isColliding({
                x: this.missiles[i].x - 10,
                y: this.missiles[i].y - 27,
                width: 20,
                height: 54
            }, {
                x: this.playerX + 16,
                y: this.playerY + 12,
                width: 18,
                height: 12
            })) {
                resourceManager.createExplosion(this.playerX + 25, this.playerY + 15);
                
                if (!this.shieldActive) {
                    this.lives--;
                    this.updateLivesDisplay();
                    resourceManager.playSound('hit', 0.8);
                } else {
                    resourceManager.playSound('powerup', 0.2);
                }
                this.missiles.splice(i, 1);
            }
        }

        // Enemy vs Player
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemyHitbox;
            if (this.enemies[i].type === 0) {
                // Ennemi rouge
                enemyHitbox = {
                    x: this.enemies[i].x - 25,
                    y: this.enemies[i].y - 25,
                    width: 50,
                    height: 50
                };
            } else {
                // Ennemi vert
                enemyHitbox = this.enemies[i];
            }

            if (this.isColliding(enemyHitbox, {
                x: this.playerX + 16,  
                y: this.playerY + 12,
                width: 18,  
                height: 12  
            })) {
                const enemy = this.enemies[i];
                
                resourceManager.createExplosion(enemy.x, enemy.y);
                
                if (!this.shieldActive) {
                    this.lives--;
                    this.updateLivesDisplay();
                    resourceManager.playSound('hit', 0.8);
                } else {
                    resourceManager.playSound('powerup', 0.2);
                }
                this.enemies.splice(i, 1);
            }
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    updateLivesDisplay() {
        const livesDisplay = document.getElementById('livesDisplay');
        if (!livesDisplay) return;

        livesDisplay.innerHTML = '';

        const heartsImg = resourceManager.getImage('hearts');
        const deadHeartsImg = resourceManager.getImage('deadHearts');
        
        if (heartsImg && deadHeartsImg) {
            const heartSize = 32;
            const heartSpacing = 8;
            
            // Afficher 3 cœurs au total
            for (let i = 0; i < 3; i++) {
                const heartDiv = document.createElement('div');
                heartDiv.style.width = heartSize + 'px';
                heartDiv.style.height = heartSize + 'px';
                
                // Cœur rouge si vivant, noir si mort
                if (i < this.lives) {
                    heartDiv.style.backgroundImage = `url('res/coeur.png')`;
                } else {
                    heartDiv.style.backgroundImage = `url('res/coeurmort.png')`;
                }
                
                heartDiv.style.backgroundPosition = '0 0';
                heartDiv.style.backgroundSize = `${heartSize}px ${heartSize}px`;
                heartDiv.style.backgroundRepeat = 'no-repeat';
                heartDiv.style.marginRight = heartSpacing + 'px';
                heartDiv.style.animation = 'heartPulse 0.3s ease';
                livesDisplay.appendChild(heartDiv);
            }
        } else {
            // Fallback avec émojis
            for (let i = 0; i < 3; i++) {
                const heartSpan = document.createElement('span');
                heartSpan.textContent = i < this.lives ? '❤️' : '🖤';
                heartSpan.style.fontSize = '1.5em';
                heartSpan.style.marginRight = '5px';
                livesDisplay.appendChild(heartSpan);
            }
        }
    }
}

// Instance globale
const game = new ShootemupGame();
