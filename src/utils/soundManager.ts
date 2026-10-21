declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
    webkitAudioContext?: typeof AudioContext;
  }
}

type SoundListener = () => void;

class SoundManager {
  private listeners: Set<SoundListener> = new Set();

  // Volume settings (persisted in localStorage)
  public bgmVolume: number = 0.05; // Default: 5% on first load
  public sfxVolume: number = 0.3;  // Default: 30% on first load

  // Per-file gain compensation to normalize loudness across all audio assets
  private readonly audioGainMap: Record<string, number> = {
    // BGM Menu Loops
    'menuloop_1':             0.45,
    'menuloop_2':             0.45,
    'menuloop_3':             0.45,
    'menuloop_4':             0.45,

    // Airplane SFX
    'plane_start':            0.30,   // loud looping engine
    'explosion_plane':        0.45,   // loud explosion
    'plane_5_sec':            0.65,   // countdown beep

    // Chest SFX
    'cofre_abierto':          0.70,
    'cofre_tic':              0.70,

    // Roulette SFX
    'spinning_roulette_wheel':0.60,
    'lightning_effect':       0.80,

    // Slots SFX
    'slot_machine_bonus_1':   0.65,
    'slot_machine_bonus_2':   0.65,
    'slot_machine_bonus_3':   0.65,

    // Win & Payout SFX
    'multi_coin_payout_3':    0.65,
    'multi_coin_payout_4':    0.65,
    'premio_mayor_jackpot':   0.75,

    // Card SFX
    'card_drop':              0.85,
    'placing_playing_card':   0.85,
    'taking_playing_card':    0.85,
    'taking_playing_card_2':  0.85,
    'taking_playing_card_3':  0.85,

    // Pinball SFX
    'pinball_launch':         0.70,
    'pinball_bounce':         0.45,
    'pinball_bumper_low':     0.60,
    'pinball_bumper_med':     0.60,
    'pinball_bumper_high':    0.70,
    'pinball_multiplier':     0.65,
    'pinball_drain':          0.55,
    'pinball_win':            0.75,
    'pinball_ambient_loop':   0.30,
  };

  /** Resolve normalized gain multiplier for a given audio file path. */
  private getFileGain(path?: string): number {
    if (!path) return 0.7;
    const filename = path.split('/').pop()?.replace(/\.(mp3|wav|ogg)$/i, '') ?? '';
    return this.audioGainMap[filename] ?? 0.7;
  }

  // Audio elements
  private bgmAudio: HTMLAudioElement | null = null;
  private ytPlayer: any = null;
  private ytReady: boolean = false;
  private ytLoadingPromise: Promise<void> | null = null;
  private activeSfx: Map<string, HTMLAudioElement> = new Map();
  private audioCtx: AudioContext | null = null;
  private chestTicBuffer: AudioBuffer | null = null;

  // Playback state
  public activeSource: 'local' | 'youtube' | 'spotify' | 'none' = 'none';
  public currentTrackIndex: number = -1;
  public currentTrackName: string = 'Ninguna';
  public isBgmPlaying: boolean = false;
  public youtubeUrl: string = '';
  public spotifyUrl: string = '';
  private currentLocalFileUrl: string | null = null;

  // Available MenuLoops
  public menuLoops = [
    { title: 'Menú Loop 1', path: '/src/assets/MenuLoop/menuloop_1.mp3' },
    { title: 'Menú Loop 2', path: '/src/assets/MenuLoop/menuloop_2.mp3' },
    { title: 'Menú Loop 3', path: '/src/assets/MenuLoop/menuloop_3.mp3' },
    { title: 'Menú Loop 4', path: '/src/assets/MenuLoop/menuloop_4.mp3' },
  ];

  constructor() {
    // Load persisted volume settings, falling back to defaults (BGM 10%, SFX 30%)
    try {
      const savedBgm = localStorage.getItem('oasis_bgm_vol');
      const savedSfx = localStorage.getItem('oasis_sfx_vol');
      if (savedBgm !== null) this.bgmVolume = parseFloat(savedBgm);
      if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
    } catch (e) {
      console.warn('LocalStorage blocked or not supported.', e);
    }

    if (typeof window !== 'undefined') {
      this.bgmAudio = new Audio();
      this.bgmAudio.loop = true;
      // Apply current BGM volume (default 10% * gain factor)
      this.bgmAudio.volume = Math.min(1, this.bgmVolume * 0.45);
      this.preloadChestTic();
    }
  }

  // Subscribe to changes in state for React components
  public subscribe(listener: SoundListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Sets the background music volume (0.0 to 1.0)
  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      const currentPath = this.currentTrackIndex >= 0 ? this.menuLoops[this.currentTrackIndex]?.path : '';
      const gain = this.getFileGain(currentPath);
      this.bgmAudio.volume = Math.min(1, this.bgmVolume * gain);
    }
    if (this.ytPlayer && this.ytReady && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(Math.round(this.bgmVolume * 100));
    }
    try {
      localStorage.setItem('oasis_bgm_vol', String(this.bgmVolume));
    } catch (e) {}
    this.notify();
  }

  // Sets the sound effects volume (0.0 to 1.0)
  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.activeSfx.forEach((sfx, key) => {
      let path = '';
      if (key === 'planeFlyLoop') path = '/src/assets/sfx/plane_start.mp3';
      else if (key === 'planeExplosion') path = '/src/assets/sfx/explosion_plane.mp3';
      else if (key === 'planeCountdown') path = '/src/assets/sfx/plane_5_sec.mp3';
      else if (key === 'rouletteSpin') path = '/src/assets/sfx/spinning_roulette_wheel.mp3';
      sfx.volume = Math.min(1, this.sfxVolume * this.getFileGain(path));
    });
    try {
      localStorage.setItem('oasis_sfx_vol', String(this.sfxVolume));
    } catch (e) {}
    this.notify();
  }

  // Plays a random BGM loop (called on login)
  public playRandomBgm() {
    const rand = Math.floor(Math.random() * this.menuLoops.length);
    this.playLocalBgm(rand);
  }

  // Plays one of the 4 MenuLoops
  public playLocalBgm(index: number) {
    if (index < 0 || index >= this.menuLoops.length) return;
    this.stopYoutube();
    this.activeSource = 'local';
    this.currentTrackIndex = index;
    this.currentTrackName = this.menuLoops[index].title;

    if (this.bgmAudio) {
      const path = this.menuLoops[index].path;
      this.bgmAudio.src = path;
      this.bgmAudio.volume = Math.min(1, this.bgmVolume * this.getFileGain(path));
      this.bgmAudio.play()
        .then(() => {
          this.isBgmPlaying = true;
          this.notify();
        })
        .catch((err) => {
          console.warn('Autoplay blocked. User action required to hear music.', err);
          this.isBgmPlaying = false;
          this.notify();
        });
    }
  }

  // Plays an uploaded user audio file
  public playUploadedFile(file: File) {
    this.stopYoutube();
    this.activeSource = 'local';
    this.currentTrackIndex = -1;
    this.currentTrackName = `Local: ${file.name}`;

    if (this.currentLocalFileUrl) {
      URL.revokeObjectURL(this.currentLocalFileUrl);
    }
    this.currentLocalFileUrl = URL.createObjectURL(file);

    if (this.bgmAudio) {
      this.bgmAudio.src = this.currentLocalFileUrl;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.play()
        .then(() => {
          this.isBgmPlaying = true;
          this.notify();
        })
        .catch((err) => {
          console.warn('Playback blocked by browser.', err);
          this.isBgmPlaying = false;
          this.notify();
        });
    }
  }

  // Parses YouTube video ID
  private extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  // Parses Spotify Track/Playlist ID
  public parseSpotifyEmbedUrl(url: string): string | null {
    const cleanUrl = url.trim();
    if (!cleanUrl.includes('spotify.com')) return null;

    try {
      const match = cleanUrl.match(/spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/);
      if (match) {
        const type = match[1];
        const id = match[2];
        return `https://open.spotify.com/embed/${type}/${id}`;
      }
    } catch (e) {}
    return null;
  }

  // Load BGM from external URL (YouTube / Spotify)
  public loadExternalUrl(url: string): boolean {
    const ytId = this.extractYoutubeId(url);
    if (ytId) {
      this.youtubeUrl = url;
      this.playYoutubeBgm(ytId);
      return true;
    }

    const spotifyEmbed = this.parseSpotifyEmbedUrl(url);
    if (spotifyEmbed) {
      this.spotifyUrl = spotifyEmbed;
      this.playSpotifyBgm();
      return true;
    }

    return false;
  }

  // Plays BGM using YouTube Iframe Player API
  private async playYoutubeBgm(videoId: string) {
    this.stopLocalAudio();
    this.activeSource = 'youtube';
    this.currentTrackIndex = -1;
    this.currentTrackName = `YouTube [${videoId}]`;
    this.notify();

    await this.loadYoutubeAPI();

    // Make sure we have player container in DOM
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.setAttribute(
        'style',
        'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;'
      );
      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player-element';
      container.appendChild(playerDiv);
      document.body.appendChild(container);
    }

    if (this.ytPlayer) {
      try {
        this.ytPlayer.loadVideoById(videoId);
        this.ytPlayer.setVolume(Math.round(this.bgmVolume * 100));
        this.ytPlayer.playVideo();
        this.isBgmPlaying = true;
        this.notify();
      } catch (e) {
        console.warn('Error loading video, re-creating player', e);
        this.createYoutubePlayer(videoId);
      }
    } else {
      this.createYoutubePlayer(videoId);
    }
  }

  private createYoutubePlayer(videoId: string) {
    if (!window.YT || !window.YT.Player) return;

    this.ytPlayer = new window.YT.Player('youtube-player-element', {
      height: '1',
      width: '1',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        loop: 1,
        playlist: videoId, // Loop requires playlist with same ID
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(Math.round(this.bgmVolume * 100));
          event.target.playVideo();
          this.isBgmPlaying = true;
          this.notify();
        },
        onStateChange: (event: any) => {
          if (event.data === 0) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
          if (event.data === 1) {
            this.isBgmPlaying = true;
          } else if (event.data === 2) {
            this.isBgmPlaying = false;
          }
          this.notify();
        },
      },
    });
  }

  private loadYoutubeAPI(): Promise<void> {
    if (this.ytLoadingPromise) return this.ytLoadingPromise;

    this.ytLoadingPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        this.ytReady = true;
        resolve();
        return;
      }

      const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        this.ytReady = true;
        resolve();
      };
    });

    return this.ytLoadingPromise;
  }

  // Active Spotify BGM
  public playSpotifyBgm() {
    this.stopLocalAudio();
    this.stopYoutube();
    this.activeSource = 'spotify';
    this.currentTrackIndex = -1;
    this.currentTrackName = 'Widget Spotify';
    this.isBgmPlaying = false; // Spotify player lives in iframe, controlled there
    this.notify();
  }

  // Global pause/play toggle
  public toggleBgm() {
    if (this.activeSource === 'local' && this.bgmAudio) {
      if (this.isBgmPlaying) {
        this.bgmAudio.pause();
        this.isBgmPlaying = false;
      } else {
        this.bgmAudio.play().then(() => {
          this.isBgmPlaying = true;
          this.notify();
        });
      }
    } else if (this.activeSource === 'youtube' && this.ytPlayer && this.ytReady) {
      if (this.isBgmPlaying) {
        this.ytPlayer.pauseVideo();
        this.isBgmPlaying = false;
      } else {
        this.ytPlayer.playVideo();
        this.isBgmPlaying = true;
      }
    } else if (this.activeSource === 'spotify') {
      // Cannot play/pause Spotify iframe programmatically
    } else {
      this.playRandomBgm();
    }
    this.notify();
  }

  private stopLocalAudio() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  private stopYoutube() {
    if (this.ytPlayer && this.ytReady && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (e) {}
    }
    this.isBgmPlaying = false;
  }

  // Plays single MP3 SFX and stores it in activeSfx if a key is provided
  public playAudioSFX(path: string, key?: string) {
    if (this.sfxVolume <= 0) return;
    if (key) {
      this.stopSFX(key);
    }
    const sfx = new Audio(path);
    sfx.volume = Math.min(1, this.sfxVolume * this.getFileGain(path));
    if (key) {
      this.activeSfx.set(key, sfx);
      sfx.onended = () => {
        if (this.activeSfx.get(key) === sfx) {
          this.activeSfx.delete(key);
        }
      };
    }
    sfx.play().catch(() => {
      // Silently catch autoplay blocking on SFX
    });
  }

  // Stops a specific active SFX by key
  public stopSFX(key: string) {
    const sfx = this.activeSfx.get(key);
    if (sfx) {
      try {
        sfx.pause();
        sfx.currentTime = 0;
      } catch (e) {}
      this.activeSfx.delete(key);
    }
  }

  // Stops all active SFX elements
  public stopAllSFX() {
    this.activeSfx.forEach((sfx) => {
      try {
        sfx.pause();
        sfx.currentTime = 0;
      } catch (e) {}
    });
    this.activeSfx.clear();
  }

  // Stops any background music playback completely
  public stopBgm() {
    this.stopLocalAudio();
    this.stopYoutube();
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch (e) {}
    }
    this.isBgmPlaying = false;
    this.activeSource = 'none';
    this.currentTrackIndex = -1;
    this.currentTrackName = 'Ninguna';
    this.notify();
  }

  // Stops both BGM and all sound effects
  public stopAll() {
    this.stopBgm();
    this.stopAllSFX();
  }

  // Master Sound Effects router
  public playSFX(type: string) {
    if (this.sfxVolume <= 0) return;

    switch (type) {
      case 'cardDraw': {
        const idx = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
        const suffix = idx === 1 ? '' : `_${idx}`;
        this.playAudioSFX(`/src/assets/sfx/taking_playing_card${suffix}.mp3`);
        break;
      }
      case 'cardDrop': {
        const rand = Math.random();
        const file = rand > 0.5 ? 'card_drop' : 'placing_playing_card';
        this.playAudioSFX(`/src/assets/sfx/${file}.mp3`);
        break;
      }
      case 'rouletteSpin':
        this.playAudioSFX('/src/assets/sfx/spinning_roulette_wheel.mp3', 'rouletteSpin');
        break;
      case 'lightningEffect':
        this.playAudioSFX('/src/assets/sfx/lightning_effect.mp3', 'lightningEffect');
        break;
      case 'slotsSpin': {
        const idx = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
        this.playAudioSFX(`/src/assets/sfx/slot_machine_bonus_${idx}.mp3`, 'slotsSpin');
        break;
      }
      case 'jackpot':
        this.playAudioSFX('/src/assets/sfx/premio_mayor_jackpot.mp3', 'winCoin');
        break;
      case 'winCoin': {
        const idx = Math.floor(Math.random() * 2) + 3; // 3 or 4
        this.playAudioSFX(`/src/assets/sfx/multi_coin_payout_${idx}.mp3`, 'winCoin');
        break;
      }
      case 'chestTic':
        this.playBuffer(this.chestTicBuffer, '/src/assets/sfx/cofre_tic.mp3');
        break;
      case 'chestOpen':
        this.playAudioSFX('/src/assets/sfx/cofre_abierto.mp3');
        break;
      // Synthesized SFX using Web Audio API
      case 'chip':
        this.synthesizeChipClick();
        break;
      case 'minesSafe':
        this.synthesizeMinesSafe();
        break;
      case 'minesExplosion':
        this.synthesizeMinesExplosion();
        break;
      case 'minesCashout':
        this.synthesizeMinesCashout();
        break;
      case 'bust':
        this.synthesizeBust();
        break;
      case 'winChime':
        this.synthesizeWinChime();
        break;
      case 'plinkoBounce':
        this.synthesizePlinkoBounce();
        break;
      case 'plinkoSlot':
        this.synthesizePlinkoSlot();
        break;
      case 'planeExplosion':
        this.playAudioSFX('/src/assets/sfx/explosion_plane.mp3', 'planeExplosion');
        break;
      case 'planeCountdown':
        this.playAudioSFX('/src/assets/sfx/plane_5_sec.mp3', 'planeCountdown');
        break;
      case 'planeFlyLoop': {
        // Loop the flying engine sound while the plane is in the air
        const flyPath = '/src/assets/sfx/plane_start.mp3';
        const flyAudio = new Audio(flyPath);
        flyAudio.volume = Math.min(1, this.sfxVolume * this.getFileGain(flyPath));
        flyAudio.loop = true;
        this.stopSFX('planeFlyLoop');
        this.activeSfx.set('planeFlyLoop', flyAudio);
        flyAudio.play().catch(() => {});
        break;
      }
      // Pinball SFX
      case 'pinballLaunch':
        this.playAudioSFX('/src/assets/sfx/pinball_launch.wav');
        break;
      case 'pinballBounce':
        this.playAudioSFX('/src/assets/sfx/pinball_bounce.wav');
        break;
      case 'pinballBumperLow':
        this.playAudioSFX('/src/assets/sfx/pinball_bumper_low.wav');
        break;
      case 'pinballBumperMed':
        this.playAudioSFX('/src/assets/sfx/pinball_bumper_med.wav');
        break;
      case 'pinballBumperHigh':
        this.playAudioSFX('/src/assets/sfx/pinball_bumper_high.wav');
        break;
      case 'pinballMultiplier':
        this.playAudioSFX('/src/assets/sfx/pinball_multiplier.wav');
        break;
      case 'pinballDrain':
        this.playAudioSFX('/src/assets/sfx/pinball_drain.wav');
        break;
      case 'pinballWin':
        this.playAudioSFX('/src/assets/sfx/pinball_win.wav', 'pinballWin');
        break;
      default:
        break;
    }
  }

  // Looping ambient music bed for the Pinball table — independent from the
  // main lobby BGM so it only plays while the game is on screen.
  public startPinballAmbient() {
    if (this.sfxVolume <= 0) return;
    const path = '/src/assets/PinballLoop/pinball_ambient_loop.wav';
    this.stopSFX('pinballAmbient');
    const amb = new Audio(path);
    amb.volume = Math.min(1, this.sfxVolume * this.getFileGain(path));
    amb.loop = true;
    this.activeSfx.set('pinballAmbient', amb);
    amb.play().catch(() => {});
  }

  public stopPinballAmbient() {
    this.stopSFX('pinballAmbient');
  }

  // --- Web Audio API Synth Methods ---

  private getAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    this.audioCtx = new AudioCtx();
    return this.audioCtx;
  }

  private async preloadChestTic() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const response = await fetch('/src/assets/sfx/cofre_tic.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.chestTicBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn('Failed to preload chest tick sound', e);
    }
  }

  private playBuffer(buffer: AudioBuffer | null, fallbackPath: string) {
    if (this.sfxVolume <= 0) return;
    const ctx = this.getAudioContext();
    if (ctx && buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = Math.min(1, this.sfxVolume * this.getFileGain(fallbackPath));
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn('Error playing audio buffer', e);
      }
    }
    // Fallback
    this.playAudioSFX(fallbackPath);
  }

  // Click on a chip
  private synthesizeChipClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.sfxVolume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // Safe diamond reveal in Mines
  private synthesizeMinesSafe() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1567.98, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.18);
  }

  // Mines bomb explosion sound
  private synthesizeMinesExplosion() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.55);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(this.sfxVolume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    const bufferSize = ctx.sampleRate * 0.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 300;
    noiseFilter.Q.value = 3.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.sfxVolume * 0.35, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    noise.start();
    osc.stop(ctx.currentTime + 0.6);
    noise.stop(ctx.currentTime + 0.6);
  }

  // Mines cashout chimes
  private synthesizeMinesCashout() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(this.sfxVolume * 0.15, ctx.currentTime + start);
      gain.gain.setValueAtTime(this.sfxVolume * 0.15, ctx.currentTime + start + duration - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playNote(659.25, 0, 0.08);
    playNote(783.99, 0.08, 0.08);
    playNote(1046.50, 0.16, 0.18);
  }

  // Bust buzzer
  private synthesizeBust() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(this.sfxVolume * 0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  // Win arpeggio chime
  private synthesizeWinChime() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(this.sfxVolume * 0.15, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playNote(523.25, 0, 0.12);
    playNote(659.25, 0.06, 0.12);
    playNote(783.99, 0.12, 0.12);
    playNote(1046.50, 0.18, 0.25);
  }

  // Plinko peg bounce melodic click
  private synthesizePlinkoBounce() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Randomize pitch slightly around 580-780Hz for natural physical feel
    const baseFreq = 540 + Math.random() * 260;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.sfxVolume * 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  // Plinko slot entry chime
  private synthesizePlinkoSlot() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, delay: number, len: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(this.sfxVolume * 0.14, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + len);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + len);
    };

    playTone(659.25, 0, 0.08);
    playTone(880.00, 0.06, 0.12);
  }
}

export const soundManager = new SoundManager();
