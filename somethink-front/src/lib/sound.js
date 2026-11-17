// 타이머 종료 알림음 (Web Audio). 브라우저 정책상 사용자가 버튼을 누른 순간에
// primeAudio() 로 오디오를 깨워 둬야 나중에 소리를 낼 수 있습니다.

let audioContext = null;

export function primeAudio() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioContext) audioContext = new AudioCtx();
        if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    } catch {
        // 소리는 부가 기능이라 실패해도 무시합니다.
    }
}

export function playChime() {
    try {
        if (!audioContext) return;
        if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
        const start = audioContext.currentTime + 0.05;
        [660, 880, 1320].forEach((frequency, index) => {
            const at = start + index * 0.18;
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start(at);
            oscillator.stop(at + 0.4);
        });
    } catch {
        // 무시
    }
}
