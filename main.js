// Глобальные переменные
let currentSound = null;
let musicStarted = false;

// Переменные для fade-анимации finalSound
let fadeInterval = null;
let volume = 0;
let direction = 'in';
let clicksLeft = 3;
const clicksSpan = document.getElementById('clicksLeft');


// Ждём полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.button');
    if (!button) {
        console.error('❌ Элемент .button не найден');
        return;
    }

    /**
     * Setup
     */
    const icon_width = 79;
    const icon_height = 79;
    const num_icons = 9;
    const time_per_icon = 100;

    let indexes = [0, 0, 0];
    let clickCount = 0;
    let isSpinning = false;

    /**
     * Остановить текущий звук
     */
    function stopCurrentSound() {
        if (currentSound) {
            currentSound.pause();
            currentSound.currentTime = 0;
            currentSound = null;
        }
    }

    /**
     * Проиграть звук
     */
    function playSound(src, volume = 1.0, duration = null) {
        stopCurrentSound();
        const sound = new Audio(src);
        sound.volume = volume;
        sound.play().catch(e => console.log('Звук заблокирован:', e));

        if (duration) {
            setTimeout(() => {
                if (sound === currentSound) {
                    sound.pause();
                    sound.currentTime = 0;
                }
            }, duration);
        }

        currentSound = sound;
    }

    /**
     * Циклический финальный звук с fade-in/out
     */
    function startFadeLoop() {
        clearInterval(fadeInterval);

        const finalSound = new Audio('sound/final.mp3');
        finalSound.volume = 0;
        finalSound.play().catch(() => {});

        fadeInterval = setInterval(() => {
            if (direction === 'in') {
                volume += 0.01;
                if (volume >= 0.6) {
                    volume = 0.6;
                    setTimeout(() => direction = 'out', 7000);
                }
            } else if (direction === 'out') {
                volume -= 0.004;
                if (volume <= 0) {
                    volume = 0;
                    direction = 'in';
                    finalSound.currentTime = 0;
                    finalSound.play().catch(() => {});
                }
            }
            finalSound.volume = volume;
        }, 50);

        currentSound = finalSound;
        return finalSound;
    }

    /**
     * Roll one reel
     */
    const roll = (reel, offset = 0, forceIndex = null) => {
        let delta;

        if (forceIndex !== null) {
            const targetIndex = forceIndex;
            const currentIndex = indexes[reel.dataset.index];
            const remainder = (targetIndex - currentIndex + num_icons) % num_icons;
            delta = 2 * num_icons + remainder;
        } else {
            delta = (offset + 2) * num_icons + Math.floor(Math.random() * num_icons);
        }

        return new Promise((resolve) => {
            const style = getComputedStyle(reel);
            const currentPosY = parseFloat(style['background-position-y']);
            const targetPosY = currentPosY + delta * icon_height;
            const normalizedPosY = targetPosY % (num_icons * icon_height);

            setTimeout(() => {
                reel.style.transition = `background-position-y ${(8 + delta) * time_per_icon}ms cubic-bezier(.41,-0.01,.63,1.09)`;
                reel.style.backgroundPositionY = `${targetPosY}px`;
            }, offset * 150);

            setTimeout(() => {
                reel.style.transition = 'none';
                reel.style.backgroundPositionY = `${normalizedPosY}px`;

                const finalIndex = Math.round(normalizedPosY / icon_height) % num_icons;
                indexes[reel.dataset.index] = finalIndex;
                resolve(finalIndex);
            }, (8 + delta) * time_per_icon + offset * 150);
        });
    };

    /**
     * Генерация случайных индексов, не все одинаковые (для первых двух вращений)
     */
    function getRandomIndices() {
        let a, b, c;
        do {
            a = Math.floor(Math.random() * num_icons);
            b = Math.floor(Math.random() * num_icons);
            c = Math.floor(Math.random() * num_icons);
        } while (a === b && b === c);
        return [a, b, c];
    }

    /**
     * Обработчик клика
     */

    button.addEventListener('click', async () => {
        if (isSpinning) return;
        isSpinning = true;
        clickCount++;

        clicksLeft--;
        if (clicksSpan && clicksLeft >= 1) {
            clicksSpan.textContent = clicksLeft;
        } else if (clicksSpan) {
            clicksSpan.parentElement.style.display = 'block';
        }
        if (clicksSpan && clicksLeft >= 1) {
            clicksSpan.textContent = clicksLeft;
            if (clicksLeft === 2) {
                button.style.background = 'linear-gradient(45deg, #964400, #b85400)';
                button.style.boxShadow = '0 4px 15px rgba(150, 68, 0, 0.4)';
            } else if (clicksLeft === 1) {
                button.style.background = 'linear-gradient(45deg, #A60000, #cc0000)';
                button.style.boxShadow = '0 4px 15px rgba(166, 0, 0, 0.4)';
            }
        } else if (clicksSpan) {
            clicksSpan.parentElement.style.display = 'block';
        }


        // Звук вращения
        const spinSound = new Audio('sound/spin.mp3');
        spinSound.volume = 0.8;
        spinSound.play().catch(() => {});

        // Длительность анимации
        const spinDuration = (8 + 2 * num_icons + 1) * time_per_icon;

        // Остановка звук
        setTimeout(() => {
            spinSound.pause();
            spinSound.currentTime = 0;
        }, spinDuration);
        
        const casinoWrapper = document.querySelector('.casino_wrapper');
        casinoWrapper.classList.remove('win1');

        const shouldAlignWin = clickCount === 3;
        const targetIcon = shouldAlignWin ? 2 : null;

        document.querySelectorAll('.reel').forEach((reel, i) => {
            reel.dataset.index = i;
        });

        try {
            let results;
            if (clickCount < 3) {
                // Первые два вращения — гарантируем, что не все иконки одинаковые
                const [a, b, c] = getRandomIndices();
                results = await Promise.all([
                    roll(document.querySelector('.reel:nth-child(1)'), 0, a),
                    roll(document.querySelector('.reel:nth-child(2)'), 1, b),
                    roll(document.querySelector('.reel:nth-child(3)'), 2, c)
                ]);
            } else {
                // Третье вращение — можно выиграть
                results = await Promise.all([
                    roll(document.querySelector('.reel:nth-child(1)'), 0, targetIcon),
                    roll(document.querySelector('.reel:nth-child(2)'), 1, targetIcon),
                    roll(document.querySelector('.reel:nth-child(3)'), 2, targetIcon)
                ]);
            }

            const [a, b, c] = results;
            const isWin = clickCount === 3 && a === b && b === c;

            if (isWin) {
                casinoWrapper.classList.add('win1');
                stopCurrentSound();
                playSound('sound/win.mp3', 0.6, 2200);
            }

            setTimeout(() => {
                casinoWrapper.classList.remove('win1');
            }, 2000);

            // Финальный экран
            if (isWin) {
                setTimeout(() => {
                    const overlay = document.getElementById('finalOverlay');
                    const textEl = document.getElementById('finalText');
                    const claimButton = document.getElementById('claimButton');
                    if (!overlay || !textEl || !claimButton) return;

                    // Показываем overlay
                    overlay.style.display = 'block';

                    // Запускаем финальный звук
                    startFadeLoop();

                    // Анимация текста по буквам
                    textEl.innerHTML = '';
                    const fullTextBefore = "Похоже сегодня ";
                    const highlightText = "ТОТ ДЕНЬ";
                    const text = fullTextBefore + highlightText;

                    let index = 0;
                    const typeWriter = setInterval(() => {
                        const char = text[index];
                        const span = document.createElement('span');

                        if (index >= fullTextBefore.length) {
                            span.classList.add('highlight');
                        }

                        span.textContent = char;
                        textEl.appendChild(span);

                        index++;

                        if (index === text.length) {
                            clearInterval(typeWriter);
                        }
                    }, 100);

                    // Обработчик кнопки
                    claimButton.onclick = () => {
                        window.open('https://band.link/totdensigle', '_blank');
                    };

                }, 2000);
            }

        } catch (err) {
            console.error('Ошибка при вращении:', err);
        }

        isSpinning = false;
    });
});