# Transcribe the song locally with word-level timestamps (faster-whisper, CPU).
# Usage: python -I transcribe.py <audio> <out.json> <model_dir> [model_name]
# The audio is only read from disk; nothing about it is sent anywhere.
import json
import os
import sys
import time


def main():
    audio, out, model_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    model_name = sys.argv[4] if len(sys.argv) > 4 else "small.en"
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
    from faster_whisper import WhisperModel

    t0 = time.time()
    model = WhisperModel(model_name, device="cpu", compute_type="int8",
                         download_root=model_dir, cpu_threads=8)
    print("model ready in %.0fs" % (time.time() - t0), flush=True)

    segments, info = model.transcribe(
        audio,
        language="en",
        beam_size=5,
        word_timestamps=True,
        vad_filter=False,
        condition_on_previous_text=False,
    )
    rows = []
    for s in segments:
        rows.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": s.text.strip(),
            "no_speech": round(s.no_speech_prob, 3),
            "avg_logprob": round(s.avg_logprob, 3),
            "words": [
                {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 3)}
                for w in (s.words or [])
            ],
        })
        print("[%7.2f - %7.2f] %s" % (s.start, s.end, s.text.strip()), flush=True)

    with open(out, "w", encoding="utf-8") as f:
        json.dump({"duration": info.duration, "model": model_name, "segments": rows}, f, ensure_ascii=False, indent=1)
    print("done in %.0fs, %d segments" % (time.time() - t0, len(rows)), flush=True)


main()
