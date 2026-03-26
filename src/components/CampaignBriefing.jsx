import { useState, useRef, useCallback, useEffect } from "react"
import { COLORS } from "../theme/colors"
import { motion, AnimatePresence } from "framer-motion"
import Icon from "./Icon"

const MIN_TEXT_LENGTH = 80
const MAX_TEXT_LENGTH = 2000
const MAX_AUDIO_DURATION_SEC = 180
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024

const TOPIC_CHIPS = [
  "Promoção local",
  "Reposicionamento",
  "Lançamento",
  "Institucional",
  "Evento",
]

const TEXT_PLACEHOLDER = `Descreva os detalhes da sua campanha:\n\n• Qual o objetivo principal?\n• Quem é o público-alvo?\n• Qual a oferta ou mensagem central?\n• Qual o tom desejado (formal, descontraído, urgente)?\n• Há alguma data limite?`

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 0",
        border: "none",
        borderBottom: `2px solid ${active ? COLORS.accent : "transparent"}`,
        background: active ? `${COLORS.accent}08` : "transparent",
        color: active ? COLORS.accent : COLORS.textDim,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <Icon name={icon} size={16} color={active ? COLORS.accent : COLORS.textDim} />
      {label}
    </button>
  )
}

function TextTab({ value, onChange, onChipClick }) {
  const charCount = value.length
  const isValid = charCount >= MIN_TEXT_LENGTH
  const isOverLimit = charCount > MAX_TEXT_LENGTH

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {TOPIC_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick(chip)}
            style={{
              padding: "5px 12px",
              borderRadius: 100,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.inputBg,
              color: COLORS.textMuted,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={TEXT_PLACEHOLDER}
          maxLength={MAX_TEXT_LENGTH + 50}
          aria-label="Detalhes da campanha"
          style={{
            width: "100%",
            minHeight: 160,
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${isOverLimit ? COLORS.danger : isValid ? COLORS.success + "60" : COLORS.border}`,
            background: COLORS.inputBg,
            color: COLORS.text,
            fontSize: 13,
            lineHeight: 1.7,
            resize: "vertical",
            fontFamily: "'Inter', system-ui, sans-serif",
            outline: "none",
            transition: "border-color 0.2s ease",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <span style={{ color: COLORS.textDim, fontSize: 11 }}>
          {charCount < MIN_TEXT_LENGTH
            ? `Mínimo ${MIN_TEXT_LENGTH - charCount} caracteres restantes`
            : ""}
        </span>
        <span
          style={{
            color: isOverLimit ? COLORS.danger : COLORS.textDim,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {charCount}/{MAX_TEXT_LENGTH}
        </span>
      </div>
    </div>
  )
}

function AudioTab({ audioBlob, audioDuration, onRecord, onStop, onReset, onPlay, onPause, isRecording, isPaused, isPlaying, playbackTime, error }) {
  return (
    <div>
      {!audioBlob && !isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "24px 0" }}
        >
          <button
            type="button"
            onClick={onRecord}
            aria-label="Iniciar gravação de áudio"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `3px solid ${COLORS.red}40`,
              background: `${COLORS.red}15`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              transition: "all 0.2s ease",
            }}
          >
            <Icon name="mic" size={32} color={COLORS.red} />
          </button>
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "0 0 4px 0" }}>
            Toque para gravar
          </p>
          <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>
            Máx. {Math.floor(MAX_AUDIO_DURATION_SEC / 60)} minutos
          </p>
        </motion.div>
      )}

      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: "center", padding: "24px 0" }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `3px solid ${COLORS.danger}`,
              background: `${COLORS.danger}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="mic" size={32} color={COLORS.danger} />
          </motion.div>

          <p style={{ color: COLORS.danger, fontSize: 14, fontWeight: 700, margin: "0 0 4px 0" }}>
            Gravando...
          </p>
          <p style={{
            color: COLORS.textMuted,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            margin: "0 0 20px 0",
          }}>
            {formatDuration(audioDuration)}
          </p>

          <button
            type="button"
            onClick={onStop}
            aria-label="Parar gravação"
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              border: `1px solid ${COLORS.danger}40`,
              background: `${COLORS.danger}15`,
              color: COLORS.danger,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="square" size={14} color={COLORS.danger} />
            Parar
          </button>
        </motion.div>
      )}

      {audioBlob && !isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: "16px 0" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: COLORS.inputBg,
              border: `1px solid ${COLORS.success}30`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              aria-label={isPlaying ? "Pausar reprodução" : "Reproduzir áudio"}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: `${COLORS.accent}20`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                name={isPlaying ? "pause" : "play"}
                size={20}
                color={COLORS.accent}
              />
            </button>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: COLORS.border,
                  overflow: "hidden",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: COLORS.accent,
                    width: `${audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0}%`,
                    transition: "width 0.3s linear",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatDuration(playbackTime)}
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatDuration(audioDuration)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onReset}
              aria-label="Regravar áudio"
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
                color: COLORS.textMuted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="rotateCcw" size={14} color={COLORS.textMuted} />
              Regravar
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: `${COLORS.success}08`,
              border: `1px solid ${COLORS.success}20`,
            }}
          >
            <Icon name="circleCheck" size={14} color={COLORS.success} />
            <span style={{ color: COLORS.success, fontSize: 12, fontWeight: 600 }}>
              Áudio pronto ({formatDuration(audioDuration)})
            </span>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: `${COLORS.danger}10`,
              border: `1px solid ${COLORS.danger}25`,
              marginTop: 12,
            }}
          >
            <Icon name="alertTriangle" size={14} color={COLORS.danger} />
            <span style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600 }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CampaignBriefing({ briefText, onBriefTextChange, audioBlob, onAudioChange, audioDuration, onAudioDurationChange }) {
  const [activeTab, setActiveTab] = useState("text")
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [recordDuration, setRecordDuration] = useState(0)
  const [audioError, setAudioError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioElementRef = useRef(null)
  const playbackTimerRef = useRef(null)
  const audioUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    setAudioError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })

      chunksRef.current = []
      let elapsed = 0

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size > MAX_AUDIO_SIZE_BYTES) {
          setAudioError("Áudio muito grande. Tente uma gravação mais curta.")
          setIsRecording(false)
          return
        }

        onAudioChange(blob)
        onAudioDurationChange(elapsed)
        setIsRecording(false)
      }

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop())
        setAudioError("Erro durante a gravação. Tente novamente.")
        setIsRecording(false)
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000)
      setIsRecording(true)
      setRecordDuration(0)

      timerRef.current = setInterval(() => {
        elapsed += 1
        setRecordDuration(elapsed)
        if (elapsed >= MAX_AUDIO_DURATION_SEC) {
          recorder.stop()
        }
      }, 1000)
    } catch {
      setAudioError("Não foi possível acessar o microfone. Verifique as permissões do navegador.")
    }
  }, [onAudioChange, onAudioDurationChange])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const resetAudio = useCallback(() => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause()
      setIsPlaying(false)
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
    onAudioChange(null)
    onAudioDurationChange(0)
    setPlaybackTime(0)
    setAudioError(null)
  }, [isPlaying, onAudioChange, onAudioDurationChange])

  const playAudio = useCallback(() => {
    if (!audioBlob) return
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(audioBlob)
    audioUrlRef.current = url

    const audio = new Audio(url)
    audioElementRef.current = audio
    setPlaybackTime(0)

    audio.play()
    setIsPlaying(true)

    playbackTimerRef.current = setInterval(() => {
      if (audio.currentTime >= audio.duration) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
        setIsPlaying(false)
        setPlaybackTime(0)
        return
      }
      setPlaybackTime(audio.currentTime)
    }, 200)

    audio.onended = () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
      setIsPlaying(false)
      setPlaybackTime(0)
    }
  }, [audioBlob])

  const pauseAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      setIsPlaying(false)
      setIsPaused(true)
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    }
  }, [])

  const handleChipClick = useCallback(
    (chip) => {
      const prefix = briefText.length > 0 ? `${briefText}\n• ` : `• `
      onBriefTextChange(`${prefix}${chip}: `)
    },
    [briefText, onBriefTextChange],
  )

  const textIsValid = briefText.length >= MIN_TEXT_LENGTH && briefText.length <= MAX_TEXT_LENGTH
  const audioIsValid = !!audioBlob && audioDuration > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ overflow: "hidden", marginBottom: 20 }}
    >
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Icon name="send" size={18} color={COLORS.accent} />
            <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
              Detalhes da campanha
            </p>
          </div>
          <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 14px 0" }}>
            Envie por texto ou grave um áudio com as informações da sua campanha.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <TabButton
            active={activeTab === "text"}
            icon="fileText"
            label="Texto"
            onClick={() => setActiveTab("text")}
          />
          <TabButton
            active={activeTab === "audio"}
            icon="mic"
            label="Áudio"
            onClick={() => setActiveTab("audio")}
          />
        </div>

        <div style={{ padding: 20 }}>
          <AnimatePresence mode="wait">
            {activeTab === "text" ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <TextTab
                  value={briefText}
                  onChange={onBriefTextChange}
                  onChipClick={handleChipClick}
                />
              </motion.div>
            ) : (
              <motion.div
                key="audio"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AudioTab
                  audioBlob={audioBlob}
                  audioDuration={audioDuration}
                  onRecord={startRecording}
                  onStop={stopRecording}
                  onReset={resetAudio}
                  onPlay={playAudio}
                  onPause={pauseAudio}
                  isRecording={isRecording}
                  isPaused={isPaused}
                  isPlaying={isPlaying}
                  playbackTime={playbackTime}
                  error={audioError}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {(textIsValid || audioIsValid) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px 14px",
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <Icon name="circleCheck" size={14} color={COLORS.success} />
            <span style={{ color: COLORS.success, fontSize: 12, fontWeight: 600 }}>
              {textIsValid && audioIsValid
                ? "Texto e áudio prontos"
                : textIsValid
                  ? "Texto do briefing pronto"
                  : "Áudio do briefing pronto"}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

CampaignBriefing.MIN_TEXT_LENGTH = MIN_TEXT_LENGTH
CampaignBriefing.MAX_TEXT_LENGTH = MAX_TEXT_LENGTH
