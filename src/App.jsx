import { useState, useRef } from "react";
import config from './config';
import Spinner from './Spinner';

export default function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > 25 * 1024 * 1024) {
      setError("File is too large. Please upload a file under 25MB.");
      return;
    }
    setFile(selectedFile);
    setAudioBlob(null);
    setError("");
    setTranscript("");
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setFile(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setError("");
      setTranscript("");
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // Send audio to backend
  const handleTranscribe = async () => {
    if (!file && !audioBlob) {
      setError("Please upload a file or record audio first.");
      return;
    }

    setLoading(true);
    setError("");
    setTranscript("");

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      } else {
        formData.append("audio", file);
      }

      const res = await fetch(`${config.backendUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setTranscript(data.transcript);
    } catch (err) {
      setError("Something went wrong: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load transcription history
  const loadHistory = async () => {
    try {
      const res = await fetch(`${config.backendUrl}/transcriptions`);
      const data = await res.json();
      setHistory(data);
      setHistoryLoaded(true);
    } catch (err) {
      setError("Could not load history.");
    }
  };

  // Clear everything
  const handleClear = () => {
    setFile(null);
    setAudioBlob(null);
    setTranscript("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center px-4 py-12">

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          🎙️ Speech<span className="text-indigo-400">to</span>Text
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Upload or record audio and get an instant transcription
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">

        {/* File Upload */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Upload Audio File</p>
          <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 transition">
            <span className="text-gray-400 text-sm">
              {file ? file.name : "Click to choose a file"}
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Record Audio */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Record Audio</p>
          {!recording ? (
            <button
              onClick={startRecording}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition border border-gray-700"
            >
              <i className="fa-solid fa-microphone mr-2"></i>
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition animate-pulse"
            >
              Stop Recording
            </button>
          )}
          {audioBlob && !recording && (
            <p className="text-green-400 text-xs mt-2 text-center">
              <i className="fa-solid fa-check mr-1"></i>
              Recording ready!
            </p>
          )}
        </div>

        {/* Transcribe Button */}
        <button
          onClick={handleTranscribe}
          disabled={loading || recording}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
        >
          {loading ? "Transcribing..." : "Transcribe"}
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="w-full mt-3 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-medium transition border border-gray-700"
        >
          Clear
        </button>

        {/* Loading Spinner */}
        {loading && <Spinner />}

        {/* Error */}
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Transcript Result */}
        {transcript && (
          <div className="mt-6 bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-indigo-400 uppercase tracking-widest">Transcript</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transcript);
                  alert("Copied to clipboard!");
                }}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-100 text-sm leading-relaxed">{transcript}</p>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="w-full max-w-xl mt-8">
        <button
          onClick={loadHistory}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition border border-gray-700"
        >
          Load Transcription History
        </button>

        {historyLoaded && history.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-4">No transcriptions yet.</p>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            className="mt-4 bg-gray-900 rounded-xl p-5 border border-gray-800"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-indigo-400 font-medium">{item.filename}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{item.transcript}</p>
          </div>
        ))}
      </div>

    </div>
  );
}