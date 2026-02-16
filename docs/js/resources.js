/**
 * resources.js
 * Gestion des images et sons
 */

class ResourceManager {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.isLoaded = false;
        this.explosions = [];
        this.soundtrack = null;
    }

    async loadResources() {
        try {
            console.log('Chargement des ressources...');

            // Charger les images
            this.images.player = await this.loadImage('res/fighter.png');
            this.images.enemy = await this.loadImage('res/enemy.png');
            this.images.rocket = await this.loadImage('res/rocket.png');
            this.images.enemyvert = await this.loadImage('res/enemyvert.png');
            this.images.explosion = await this.loadImage('res/spriteexplosion.png');
            this.images.gameSheet = await this.loadImage('res/gameSheet.png');
            
            // images des cœurs
            try {
                this.images.hearts = await this.loadImage('res/coeur.png');
                this.images.deadHearts = await this.loadImage('res/coeurmort.png');
            } catch (e) {
                console.warn('Image de cœurs non trouvée');
            }

            // Charger les sons 
            this.sounds.explode = await this.loadSound('res/explode.wav');
            this.sounds.hit = await this.loadSound('res/hit.wav');
            this.sounds.powerup = await this.loadSound('res/powerup.wav');
            this.sounds.powerdown = await this.loadSound('res/powerdown.mp3');
            this.sounds.gameOver = await this.loadSound('res/game-over-arcade.mp3');
            this.sounds.laser = await this.loadSound('res/laser.wav');
            
            
            // Charger la musique de fond
            this.soundtrack = await this.loadSound('res/soundtrack.mp3');
            if (this.soundtrack) {
                this.soundtrack.loop = true;
                this.soundtrack.volume = 0.3;
            }

            this.isLoaded = true;
            console.log('Ressources chargées avec succès');
            return true;
        } catch (error) {
            console.warn('Erreur lors du chargement des ressources:', error);
            console.log('Utilisation des graphiques de fallback');
            this.isLoaded = true;
            return false;
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Impossible de charger: ${src}`));
            img.src = src;
        });
    }

    loadSound(src) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplay = () => resolve(audio);
            audio.onerror = () => {
                console.warn(`Son non trouvé: ${src}`);
                resolve(null);
            };
            audio.src = src;
        });
    }

    playSound(soundName, volume = 0.3) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = volume;
            sound.play().catch(e => console.log('Erreur lecture son:', e));
        }
    }

    playSoundtrack() {
        if (this.soundtrack) {
            this.soundtrack.currentTime = 0;
            this.soundtrack.play().catch(e => console.log('Erreur lecture soundtrack:', e));
        }
    }

    continueSoundtrack() {
        if (this.soundtrack && this.soundtrack.paused) {
            this.soundtrack.play().catch(e => console.log('Erreur lecture soundtrack:', e));
        }
    }

    pauseSoundtrack() {
        if (this.soundtrack) {
            this.soundtrack.pause();
        }
    }

    setMuted(muted) {
        const volume = muted ? 0 : 1;
        
        // Mute/unmute all sound effects
        for (let key in this.sounds) {
            if (this.sounds[key]) {
                this.sounds[key].muted = muted;
            }
        }
        
        // Mute/unmute soundtrack
        if (this.soundtrack) {
            this.soundtrack.muted = muted;
        }
    }

    getImage(imageName) {
        return this.images[imageName] || null;
    }

    // animation d'explosion
    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            frame: 0,
            maxFrames: 25, 
            frameCounter: 0,
            frameDelay: 2,
            active: true
        });
    }

    //Mettre à jour et dessiner les explosions
    updateAndDrawExplosions(ctx) {
        const explosionImg = this.getImage('explosion');
        if (!explosionImg) return;

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];

            if (!exp.active) {
                this.explosions.splice(i, 1);
                continue;
            }

            // Calculer la position dans la spritesheet 
            const spriteSize = 45;
            const col = exp.frame % 5;
            const row = Math.floor(exp.frame / 5);
            const srcX = col * spriteSize;
            const srcY = row * spriteSize;

            try {
                ctx.save();
                ctx.globalAlpha = 0.9;
                
                // Dessiner l'explosion
                ctx.drawImage(
                    explosionImg,
                    srcX, srcY, spriteSize, spriteSize,
                    exp.x - spriteSize / 2, exp.y - spriteSize / 2, 
                    spriteSize * 1.5, spriteSize * 1.5
                );
                
                ctx.restore();
            } catch (e) {
                console.warn('Erreur dessin explosion:', e);
            }

            // Mettre à jour l'animation
            exp.frameCounter++;
            if (exp.frameCounter >= exp.frameDelay) {
                exp.frame++;
                exp.frameCounter = 0;

                // Terminer l'explosion
                if (exp.frame >= exp.maxFrames) {
                    exp.active = false;
                }
            }
        }
    }
}

// Instance globale
const resourceManager = new ResourceManager();