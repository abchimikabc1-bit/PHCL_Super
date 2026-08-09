/**
 * Multilingual AI Voice & Text Assistant Widget Controller
 * Supports 4 Languages: Swahili (sw-TZ), English (en-US), French (fr-FR), Chinese (zh-CN)
 * Includes Speech Recognition, Speech Synthesis (Voice Readout), and Accessibility Support.
 */

class AIWidgetController {
  constructor() {
    this.currentLang = 'sw';
    this.isVoiceEnabled = true;
    this.isHighContrast = false;

    this.langMap = {
      sw: { langCode: 'sw-TZ', name: '🇹🇿 Kiswahili' },
      en: { langCode: 'en-US', name: '🇬🇧 English' },
      fr: { langCode: 'fr-FR', name: '🇫🇷 Français' },
      zh: { langCode: 'zh-CN', name: '🇨🇳 中文 (Chinese)' },
    };

    this.synth = window.speechSynthesis || null;
    this.recognition = null;

    if (this.synth && typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = () => {
        if (this.synth) this.synth.getVoices();
      };
    }

    this.initSpeechRecognition();
    this.bindShortcuts();
  }

  // 1. INITIATE SPEECH RECOGNITION (Voice Input)
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiInputText').value = transcript;
        this.sendQuery(transcript);
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
      };
    }
  }

  // 2. KEYBOARD SHORTCUT FOR ACCESSIBILITY (Alt + A toggles High Contrast)
  bindShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        this.toggleHighContrast();
      }
    });
  }

  toggleHighContrast() {
    this.isHighContrast = !this.isHighContrast;
    document.body.classList.toggle('high-contrast-mode', this.isHighContrast);
    const msg = this.isHighContrast ? 'Mode ya High Contrast imewashwa' : 'Mode ya Kawaida imerejeshwa';
    this.speakOut(msg);
  }

  toggleChatWindow() {
    const win = document.getElementById('aiChatWindow');
    win.classList.toggle('active');
  }

  setLanguage(lang) {
    if (this.langMap[lang]) {
      this.currentLang = lang;
      this.speakOut(`Language set to ${this.langMap[lang].name}`);
    }
  }

  toggleVoiceReadout() {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    const btn = document.getElementById('voiceToggleBtn');
    btn.textContent = this.isVoiceEnabled ? '🔊 Voice On' : '🔇 Voice Off';
  }

  startVoiceInput() {
    if (this.recognition) {
      this.recognition.lang = this.langMap[this.currentLang].langCode;
      this.recognition.start();
      this.speakOut('Listening for your voice input...');
    } else {
      alert('Speech Recognition haipatikani kwenye browser yako. Tafadhali tumia kuandika.');
    }
  }

  stopSpeech() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  // 3. TEXT-TO-SPEECH VOICE READOUT (Multilingual Voice Speech Synthesis)
  speakOut(text, onEndCallback, langCode) {
    if (!this.synth) {
      if (typeof onEndCallback === 'function') onEndCallback();
      return;
    }

    try {
      this.synth.cancel(); // Stop active utterance immediately
    } catch (e) {}

    const selectedLang = langCode || this.currentLang || 'sw';
    const langConfig = this.langMap[selectedLang] || this.langMap['sw'];

    // Short 60ms timeout prevents Chrome/Edge from cancelling newly queued utterance
    setTimeout(() => {
      try {
        if (this.synth.paused) {
          this.synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const availableVoices = this.synth.getVoices();
        let chosenVoice = null;

        if (availableVoices && availableVoices.length > 0) {
          const targetPrefix = selectedLang.toLowerCase();

          // 1. Direct language code prefix match (sw, en, fr, zh)
          chosenVoice = availableVoices.find((v) => {
            const langLower = v.lang ? v.lang.toLowerCase() : '';
            return langLower.startsWith(targetPrefix) || langLower.includes(targetPrefix);
          });

          // 2. Swahili regional fallbacks
          if (!chosenVoice && selectedLang === 'sw') {
            chosenVoice = availableVoices.find((v) => {
              const langLower = v.lang ? v.lang.toLowerCase() : '';
              const nameLower = v.name ? v.name.toLowerCase() : '';
              return langLower.includes('sw') || nameLower.includes('swahili') || nameLower.includes('kiswahili') || langLower.includes('en-za');
            });
          }

          // 3. Universal Fallback: Use default system voice
          if (!chosenVoice) {
            chosenVoice = availableVoices.find((v) => v.default) || availableVoices[0];
          }
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
          utterance.lang = chosenVoice.lang || langConfig.langCode;
        } else {
          utterance.lang = langConfig.langCode;
        }

        // Natural enunciation pitch and rate tuning
        utterance.rate = 0.92;
        utterance.pitch = 1.05;

        if (typeof onEndCallback === 'function') {
          utterance.onend = () => onEndCallback();
          utterance.onerror = () => onEndCallback();
        }

        this.synth.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        if (typeof onEndCallback === 'function') onEndCallback();
      }
    }, 60);
  }

  // 4. SEND QUERY TO AI ENGINE / API
  async sendQuery(customQuery) {
    const inputEl = document.getElementById('aiInputText');
    const query = customQuery || inputEl.value.trim();
    if (!query) return;

    if (!customQuery) inputEl.value = '';

    this.appendMessage(query, 'user');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lang: this.currentLang }),
      });

      const data = await res.json();
      const aiReply = data.response;

      this.appendMessage(aiReply, 'ai');
      this.speakOut(aiReply);
    } catch (err) {
      const fallback = 'Samahani, server haikuweza kujibu kwa sasa.';
      this.appendMessage(fallback, 'ai');
      this.speakOut(fallback);
    }
  }

  appendMessage(text, sender) {
    const chatBody = document.getElementById('aiChatBody');
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.textContent = text;

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

const aiWidget = new AIWidgetController();
