(function() {
    // ---------- АУДИО ----------
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // ноты (C4 - B5)
    const NOTES = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4',
                   'C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5','A5','A#5','B5'];
    const NOTE_FREQ = {
        'C4':261.63,'C#4':277.18,'D4':293.66,'D#4':311.13,'E4':329.63,
        'F4':349.23,'F#4':369.99,'G4':392.00,'G#4':415.30,'A4':440.00,
        'A#4':466.16,'B4':493.88,'C5':523.25,'C#5':554.37,'D5':587.33,
        'D#5':622.25,'E5':659.25,'F5':698.46,'F#5':739.99,'G5':783.99,
        'G#5':830.61,'A5':880.00,'A#5':932.33,'B5':987.77
    };

    // состояние
    let isPlaying = false;
    let currentStep = 0;
    let timerId = null;
    let bpm = 120;

    // паттерн: 16 шагов, каждый шаг содержит массив нот (индексы из NOTES)
    const PATTERN_LENGTH = 16;
    let pattern = Array.from({ length: PATTERN_LENGTH }, () => []);

    // UI элементы
    const pianoRollEl = document.getElementById('pianoRoll');
    const stepSequencerEl = document.getElementById('stepSequencer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearBtn = document.getElementById('clearBtn');
    const bpmInput = document.getElementById('bpmInput');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const panSlider = document.getElementById('panSlider');
    const panValue = document.getElementById('panValue');

    // отображение клавиш пиано-ролла
    function renderPiano() {
        pianoRollEl.innerHTML = '';
        NOTES.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'piano-key';
            if (note.includes('#')) {
                key.classList.add('black');
            } else {
                key.classList.add('white');
            }
            key.textContent = note.replace('#', '♯');
            key.dataset.noteIndex = index;
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                playNote(index);
                key.classList.add('active');
            });
            key.addEventListener('mouseup', () => key.classList.remove('active'));
            key.addEventListener('mouseleave', () => key.classList.remove('active'));
            pianoRollEl.appendChild(key);
        });
    }

    // отображение секвенсора
    function renderSequencer() {
        stepSequencerEl.innerHTML = '';
        for (let step = 0; step < PATTERN_LENGTH; step++) {
            const cell = document.createElement('div');
            cell.className = 'step-cell';
            if (pattern[step] && pattern[step].length > 0) {
                cell.classList.add('active');
            }
            if (step === currentStep && isPlaying) {
                cell.classList.add('playing');
            }
            cell.textContent = step + 1;
            cell.dataset.step = step;
            cell.addEventListener('click', () => {
                toggleStep(step);
            });
            stepSequencerEl.appendChild(cell);
        }
    }

    // переключить шаг
    function toggleStep(stepIndex) {
        if (pattern[stepIndex] && pattern[stepIndex].length > 0) {
            pattern[stepIndex] = [];
        } else {
            const randomNoteIndex = Math.floor(Math.random() * 12);
            pattern[stepIndex] = [randomNoteIndex];
        }
        renderSequencer();
    }

    // воспроизведение ноты
    function playNote(noteIndex, volume = 0.7, pan = 0) {
        try {
            const ctx = initAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const panner = ctx.createStereoPanner();

            osc.type = 'sawtooth';
            osc.frequency.value = NOTE_FREQ[NOTES[noteIndex]] || 440;

            gain.gain.value = volume * 0.4;
            panner.pan.value = pan;

            osc.connect(gain);
            gain.connect(panner);
            panner.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {
            console.warn('audio error:', e);
        }
    }

    // воспроизвести шаг (все ноты в шаге)
    function playStep(stepIndex) {
        const notes = pattern[stepIndex] || [];
        const vol = parseFloat(volumeSlider.value) || 0.7;
        const pan = parseFloat(panSlider.value) || 0;
        notes.forEach(noteIdx => {
            playNote(noteIdx, vol, pan);
        });
    }

    // обновить отображение шага (подсветка)
    function updateStepDisplay() {
        const cells = stepSequencerEl.querySelectorAll('.step-cell');
        cells.forEach((cell, idx) => {
            cell.classList.remove('playing');
            if (idx === currentStep && isPlaying) {
                cell.classList.add('playing');
            }
        });
    }

    // остановить воспроизведение
    function stopPlayback() {
        isPlaying = false;
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        currentStep = 0;
        updateStepDisplay();
        playBtn.textContent = '▶ Воспроизвести';
        document.querySelectorAll('.step-cell').forEach(el => el.classList.remove('playing'));
    }

    // запуск воспроизведения
    function startPlayback() {
        if (isPlaying) return;
        initAudio();
        isPlaying = true;
        playBtn.textContent = '⏸ Пауза';
        currentStep = 0;
        document.querySelectorAll('.step-cell').forEach(el => el.classList.remove('playing'));
        scheduleStep();
    }

    function scheduleStep() {
        if (!isPlaying) return;
        playStep(currentStep);
        updateStepDisplay();

        currentStep = (currentStep + 1) % PATTERN_LENGTH;

        const intervalMs = (60000 / bpm) / 4;
        timerId = setTimeout(() => {
            scheduleStep();
        }, intervalMs);
    }

    // переключить play/pause
    function togglePlay() {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    }

    // очистить паттерн
    function clearPattern() {
        if (isPlaying) stopPlayback();
        pattern = Array.from({ length: PATTERN_LENGTH }, () => []);
        renderSequencer();
    }

    // обновить BPM
    function updateBpm() {
        let val = parseInt(bpmInput.value);
        if (isNaN(val) || val < 20) val = 20;
        if (val > 300) val = 300;
        bpm = val;
        bpmInput.value = val;
        if (isPlaying) {
            stopPlayback();
            startPlayback();
        }
    }

    // обновить значения микшера
    function updateMixerLabels() {
        const vol = parseFloat(volumeSlider.value) || 0;
        volumeValue.textContent = Math.round(vol * 100) + '%';
        const pan = parseFloat(panSlider.value) || 0;
        if (pan < -0.05) panValue.textContent = 'L' + Math.round(Math.abs(pan) * 100) + '%';
        else if (pan > 0.05) panValue.textContent = 'R' + Math.round(pan * 100) + '%';
        else panValue.textContent = 'C';
    }

    // ----- инициализация -----
    renderPiano();
    renderSequencer();

    // слушатели
    playBtn.addEventListener('click', togglePlay);
    stopBtn.addEventListener('click', () => {
        stopPlayback();
        document.querySelectorAll('.step-cell').forEach(el => el.classList.remove('playing'));
    });
    clearBtn.addEventListener('click', clearPattern);

    bpmInput.addEventListener('change', updateBpm);
    bpmInput.addEventListener('input', function() {
        let val = parseInt(this.value);
        if (!isNaN(val) && val >= 20 && val <= 300) {
            bpm = val;
        }
    });

    volumeSlider.addEventListener('input', updateMixerLabels);
    panSlider.addEventListener('input', updateMixerLabels);
    updateMixerLabels();

    document.addEventListener('click', () => {
        initAudio();
    }, { once: false });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            togglePlay();
        }
    });

    // демо-паттерн
    pattern[0] = [0, 4, 7];
    pattern[4] = [5, 9, 12];
    pattern[8] = [7, 11, 14];
    pattern[12] = [12, 16, 19];
    renderSequencer();

    console.log('🎹 FL Studio Lite — готов!');
})();