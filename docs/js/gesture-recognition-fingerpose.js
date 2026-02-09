/**
 * gesture-recognition-fingerpose.js
 * Reconnaissance des gestes via fingerpose et intégration avec le jeu
 */

class GestureRecognizerFingerpose {
    constructor() {
        this.detector = null;
        this.stream = null;
        this.rafId = null;
        this.lastGesture = null;
        this.currentGesture = null;
        this.confidenceScore = 0;
        this.gestureCallbacks = [];
        this.isRunning = false;
    }

    buildGestureEstimator() {
        // Index up (☝️) = TIR
        const indexUp = new fp.GestureDescription("index_up");
        indexUp.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
        indexUp.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
        indexUp.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, 0.85);
        indexUp.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpRight, 0.85);

        for (const f of [fp.Finger.Thumb, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
            indexUp.addCurl(f, fp.FingerCurl.FullCurl, 1.0);
            indexUp.addCurl(f, fp.FingerCurl.HalfCurl, 0.9);
        }

        // Thumb right (👍➡️) = DROITE
        const thumbRight = new fp.GestureDescription("thumb_right");
        thumbRight.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
        thumbRight.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalRight, 1.0);
        thumbRight.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpRight, 0.85);
        thumbRight.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownRight, 0.85);

        for (const f of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
            thumbRight.addCurl(f, fp.FingerCurl.FullCurl, 1.0);
            thumbRight.addCurl(f, fp.FingerCurl.HalfCurl, 0.9);
        }

        // Thumb left (👍⬅️) = GAUCHE
        const thumbLeft = new fp.GestureDescription("thumb_left");
        thumbLeft.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
        thumbLeft.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 1.0);
        thumbLeft.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 0.85);
        thumbLeft.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownLeft, 0.85);

        for (const f of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
            thumbLeft.addCurl(f, fp.FingerCurl.FullCurl, 1.0);
            thumbLeft.addCurl(f, fp.FingerCurl.HalfCurl, 0.9);
        }

        // Open palm (✋) = BOUCLIER (plus strict)
        const openPalm = new fp.GestureDescription("open_palm");
        for (const f of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
            openPalm.addCurl(f, fp.FingerCurl.NoCurl, 1.0);
        }

        return new fp.GestureEstimator([indexUp, thumbRight, thumbLeft, openPalm]);
    }

    toLandmarks(hand) {
        const kp = hand.keypoints3D ?? hand.keypoints;
        return kp.map(p => [p.x, p.y, p.z ?? 0]);
    }

    pickBestGesture(gestures) {
        if (!gestures?.length) return null;
        return gestures.reduce((best, g) => (g.score > best.score ? g : best), gestures[0]);
    }

    mapGestureToAction(gestureName) {
        const mapping = {
            'index_up': 'UP',
            'thumb_right': 'RIGHT',
            'thumb_left': 'LEFT',
            'open_palm': null,
            'two_hands_open_palm': null
        };
        return mapping[gestureName] || null;
    }

    async initialize() {
        try {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');

            if (!video || !canvas) {
                console.error('❌ Éléments vidéo ou canvas non trouvés');
                return false;
            }

            // Accès à la caméra
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            video.srcObject = this.stream;
            await video.play();

            // Initialiser TensorFlow.js
            await tf.setBackend("webgl");
            await tf.ready();

            // Créer le détecteur
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            this.detector = await handPoseDetection.createDetector(model, {
                runtime: "mediapipe",
                modelType: "full",
                maxHands: 2,
                solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915"
            });

            this.ge = this.buildGestureEstimator();
            this.isRunning = true;
            console.log('✓ Détecteur de gestes initialisé');

            // Démarrer la boucle de détection
            this.startDetectionLoop(video, canvas);

            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation gestes:', error);
            return false;
        }
    }

    startDetectionLoop(video, canvas) {
        const ctx = canvas.getContext('2d');
        let frameCount = 0;
        
        const processFrame = async () => {
            if (!this.isRunning || !this.detector) return;

            try {
                // Redimensionner le canvas si nécessaire
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                const predictions = await this.detector.estimateHands(video, {
                    flipHorizontal: true
                });

                // Effacer le canvas et redessiner la vidéo
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Debug: afficher les predictions
                if (frameCount % 30 === 0) {
                    console.log('🎥 Predictions:', predictions.length, 'mains détectées');
                }

                // Dessiner le squelette pour chaque main détectée
                for (const hand of predictions) {
                    this.drawHandSkeleton(ctx, hand);
                }

                frameCount++;

                // Traiter les gestes
                const perHand = predictions.map(hand => {
                    const landmarks = this.toLandmarks(hand);
                    const est = this.ge.estimate(landmarks, 8.4);
                    const best = this.pickBestGesture(est.gestures);
                    return best ? { name: best.name, score: best.score } : null;
                });

                // Détecter deux mains ouvertes
                const twoHandsOpen =
                    perHand.length === 2 &&
                    perHand[0]?.name === "open_palm" &&
                    perHand[0]?.score >= 7 &&
                    perHand[1]?.name === "open_palm" &&
                    perHand[1]?.score >= 7;

                let gesture = null;
                let score = 0;

                if (twoHandsOpen) {
                    gesture = 'TWO_HANDS_OPEN';
                    score = Math.min(perHand[0].score, perHand[1].score);
                    console.log('🛡️ TWO_HANDS_OPEN activé! Score:', score);
                } else {
                    const bestAny = perHand
                        .filter(Boolean)
                        .sort((a, b) => b.score - a.score)[0];

                    if (bestAny) {
                        gesture = this.mapGestureToAction(bestAny.name);
                        score = bestAny.score;
                    }
                }

                // Mettre à jour le geste actuel
                this.currentGesture = gesture;
                this.confidenceScore = score;

                // Mettre à jour l'affichage
                this.updateDisplay(gesture, score);

                // Notifier les callbacks
                if (gesture && gesture !== this.lastGesture) {
                    this.lastGesture = gesture;
                    this.notifyCallbacks(gesture);
                }

            } catch (error) {
                console.log('Erreur processus détection:', error);
            }

            this.rafId = requestAnimationFrame(processFrame);
        };

        processFrame();
    }

    drawHandSkeleton(ctx, hand) {
        const keypoints = hand.keypoints;
        
        if (!keypoints || keypoints.length === 0) {
            console.log('❌ Pas de keypoints');
            return;
        }

        console.log('✓ Dessin du squelette avec', keypoints.length, 'points');

        // Connexions des doigts selon le modèle MediaPipe
        const connections = [
            // Poignet au pouce
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Poignet à l'index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Poignet au majeur
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Poignet à l'annulaire
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Poignet au petit doigt
            [0, 17], [17, 18], [18, 19], [19, 20]
        ];
   
        // Dessiner les connexions
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const [start, end] of connections) {
            const pt1 = keypoints[start];
            const pt2 = keypoints[end];

            if (pt1 && pt2 && pt1.x && pt1.y && pt2.x && pt2.y) {
            
                const x1 = ctx.canvas.width - pt1.x;
                const x2 = ctx.canvas.width - pt2.x;
                
                ctx.beginPath();
                ctx.moveTo(x1, pt1.y);
                ctx.lineTo(x2, pt2.y);
                ctx.stroke();
            }
        }

        // Dessiner les points 
        ctx.fillStyle = '#0099cc';
        ctx.strokeStyle = '#0099cc';
        ctx.lineWidth = 1;

        for (let i = 0; i < keypoints.length; i++) {
            const keypoint = keypoints[i];
            if (keypoint && keypoint.x && keypoint.y) {
                // Inverser l'axe x pour correspondre à la vidéo non-mirroir
                const x = ctx.canvas.width - keypoint.x;
                
                ctx.beginPath();
                ctx.arc(x, keypoint.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        console.log('✓ Squelette dessiné');
    }

    updateDisplay(gesture, score) {
        const elGesture = document.getElementById('gesture');
        const elScore = document.getElementById('score');

        if (elGesture && elScore) {
            const gestureEmoji = {
                'UP': '👆',
                'DOWN': '👇',
                'LEFT': '👈',
                'RIGHT': '👉',
                'OPEN_HAND': '✋',
                'TWO_HANDS_OPEN': '✋✋'
            }[gesture] || '-';

            elGesture.textContent = gestureEmoji;
            elScore.textContent = (score || 0).toFixed(2);
            
            // Log pour déboguer
            if (gesture === 'TWO_HANDS_OPEN') {
                console.log('🛡️ TWO_HANDS_OPEN détecté avec score:', score);
            }
        }
    }

    getCurrentGesture() {
        return this.currentGesture;
    }

    onGesture(callback) {
        this.gestureCallbacks.push(callback);
    }

    notifyCallbacks(gesture) {
        this.gestureCallbacks.forEach(callback => callback(gesture));
    }

    stop() {
        this.isRunning = false;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }

        if (this.detector?.dispose) {
            this.detector.dispose();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }

        document.getElementById('gesture').textContent = '-';
        document.getElementById('score').textContent = '0.00';
    }
}

// Instance globale
const gestureRecognizer = new GestureRecognizerFingerpose();