import React, { useState, useEffect, useRef } from "react";
import { soundManager } from "../../utils/soundManager";

export function useSoundManager() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return soundManager.subscribe(() => setTick((t) => t + 1));
  }, []);
  return soundManager;
}

export default function MusicControl() {
  const sm = useSoundManager();
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sm.playUploadedFile(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const success = sm.loadExternalUrl(urlInput);
    if (success) {
      setUrlInput("");
    } else {
      alert("Enlace no válido. Por favor, introduce un enlace válido de YouTube, YouTube Music o Spotify.");
    }
  };

  return (
    <div className="music-control-wrapper">
      <button
        type="button"
        className={`balance-chip music-btn ${sm.isBgmPlaying ? "playing" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Control de Música de Fondo"
      >
        <div className="sound-waves">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
        <span className="icon">🎵</span>
        <span className="lbl-txt">Sonido</span>
      </button>

      {isOpen && (
        <>
          <div className="music-popover-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="music-popover">
            <div className="music-popover-header">
              <h3>🎵 Música y Sonido</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* General Control Bar */}
            <div className="music-quick-bar">
              <span className="track-info-label">
                Sonando: <b>{sm.currentTrackName}</b>
              </span>
              <button
                type="button"
                className={`btn btn-sm ${sm.isBgmPlaying ? "btn-outline" : "btn-gold"}`}
                onClick={() => sm.toggleBgm()}
                disabled={sm.activeSource === "spotify"}
              >
                {sm.isBgmPlaying ? "Pausar" : "Reproducir"}
              </button>
            </div>

            {/* Volume sliders */}
            <div className="music-volume-section">
              <div className="vol-slider-row">
                <label>🔊 Música de Fondo</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sm.bgmVolume}
                    onChange={(e) => sm.setBgmVolume(parseFloat(e.target.value))}
                  />
                  <span className="vol-pct">{Math.round(sm.bgmVolume * 100)}%</span>
                </div>
              </div>
              <div className="vol-slider-row">
                <label>🕹️ Efectos Especiales (SFX)</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sm.sfxVolume}
                    onChange={(e) => sm.setSfxVolume(parseFloat(e.target.value))}
                  />
                  <span className="vol-pct">{Math.round(sm.sfxVolume * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Playlist Loops selector */}
            <div className="music-track-list">
              <h4>Listas oficiales del Oasis</h4>
              <div className="loops-grid">
                {sm.menuLoops.map((loop, idx) => {
                  const isActive = sm.activeSource === "local" && sm.currentTrackIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`loop-pill-btn ${isActive ? "active" : ""}`}
                      onClick={() => sm.playLocalBgm(idx)}
                    >
                      {isActive && <span className="active-dot"></span>}
                      {loop.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Local Upload */}
            <div className="music-upload-section">
              <h4>Subir archivo local</h4>
              <button
                type="button"
                className="btn btn-outline btn-sm btn-block"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Seleccionar archivo de audio
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="audio/*"
                onChange={handleFileUpload}
              />
            </div>

            {/* YouTube / Spotify input */}
            <div className="music-url-section">
              <h4>Enlace externo (YouTube / Youtube Music)</h4>
              <form onSubmit={handleUrlSubmit} className="url-form">
                <input
                  type="text"
                  placeholder="Pegar enlace de YouTube o Youtube Music..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button type="submit" className="btn btn-gold btn-sm">
                  Cargar
                </button>
              </form>
              <p className="url-hint">
                Soporta links de YouTube, Youtube Music y canciones.
              </p>
            </div>

            {/* Spotify Player embed */}
            {sm.activeSource === "spotify" && sm.spotifyUrl && (
              <div className="spotify-embed-container">
                <iframe
                  src={sm.spotifyUrl}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify Player"
                ></iframe>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
