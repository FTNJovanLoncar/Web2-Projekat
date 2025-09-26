import { useEffect, useRef, useState } from "react";
import { HubConnectionState, LogLevel } from "@microsoft/signalr";
import { newLiveConnection } from "./realtime";
import { getJwt } from "./auth";
import "./LiveHost.css";

function errorDetails(err, conn, context) {
  const parts = [`${context} failed`];

  let msg = (err && (err.error || err.message)) ?? (typeof err === "string" ? err : null);
  if (!msg && err) { try { msg = JSON.stringify(err); } catch {} }
  if (msg) parts.push(`message=${msg}`);

  if (err?.name) parts.push(`name=${err.name}`);
  if (err?.stack) parts.push(`stackHead=${String(err.stack).split("\n")[0]}`);
  if (err?.statusCode) parts.push(`status=${err.statusCode}`);
  if (err?.statusText) parts.push(`statusText=${err.statusText}`);
  if (err?.innerError) parts.push(`inner=${err.innerError?.message || String(err.innerError)}`);
  if (err?.cause) parts.push(`cause=${err.cause?.message || String(err.cause)}`);

  if (conn) {
    parts.push(`conn.state=${conn.state}`);
    const t = conn?.transport || conn?._connectionState?.transport || conn?._connection?.transport;
    const tName = t?.constructor?.name || t?.name || "";
    if (tName) parts.push(`transport=${tName}`);
    const url = conn.baseUrl || conn?._connection?.baseUrl || "(unknown url)";
    parts.push(`url=${url}`);
  }
  return parts.join(" | ");
}

export default function LiveHost() {
  const [quizId, setQuizId] = useState("");
  const [timePerQ, setTimePerQ] = useState(30);
  const [countdown, setCountdown] = useState(5);
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Lobby");
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null);
  const [qSeconds, setQSeconds] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastCorrect, setLastCorrect] = useState(null);

  // OPTIONAL: track UI hints for pause/lock (backend may not broadcast IsLocked)
  const [paused, setPaused] = useState(false);

  const connRef = useRef(null);

  // --- small helper to ensure the hub is connected before invoking ---
  async function ensureConnected() {
    const c = connRef.current;
    if (!c) throw new Error("No hub connection");
    if (c.state !== HubConnectionState.Connected) {
      if (c.state === HubConnectionState.Disconnected) await c.start();
      else throw new Error("Connection not ready");
    }
    return c;
  }

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { alert("Login first."); return; }

    const conn = newLiveConnection({ logging: LogLevel.Information });
    connRef.current = conn;

    // lifecycle diagnostics
    conn.onclose((e) => {
      if (e) console.error("[LiveHost] connection closed with error:", e);
      else console.warn("[LiveHost] connection closed.");
    });
    conn.onreconnecting((e) => console.warn("[LiveHost] reconnecting...", e));
    conn.onreconnected((id) => console.info("[LiveHost] reconnected, id:", id));

    // events from server
    conn.on("RoomUpdated", (m) => {
      setStatus(m.status ?? m.Status ?? "");
      setParticipants(m.participants ?? m.Participants ?? []);
    });
    conn.on("CountdownTick", (m) => setQSeconds(m.secondsLeft));
    conn.on("QuestionStarted", (m) => {
      setQuestion(m.question);
      setQSeconds(null);
      setLastCorrect(null);
      setPaused(false); // NEW
    });
    conn.on("QuestionTick", (m) => setQSeconds(m.secondsLeft));
    conn.on("QuestionEnded", (m) => {
      setQuestion(null);
      setQSeconds(null);
      setLastCorrect(m.correct);
      setLeaderboard(m.leaderboard ?? []);
      setPaused(false); // NEW
    });
    conn.on("LeaderboardUpdated", (m) => setLeaderboard(m.leaderboard ?? []));

    // NEW: handle moderation events
    conn.on("QuestionPaused", () => { setPaused(true); setStatus("Paused"); });
    conn.on("QuestionResumed", () => { setPaused(false); setStatus("Question"); });

    conn.on("SessionError", (e) => {
      console.error("[LiveHost] SessionError:", e);
      alert(errorDetails(e, conn, "Session"));
    });
    conn.on("SessionEnded", (m) => {
      setStatus("Finished");
      setLeaderboard(m.leaderboard ?? []);
    });

    (async () => {
      try {
        if (conn.state === HubConnectionState.Disconnected) {
          await conn.start();
          console.info("[LiveHost] hub started");
        }
      } catch (e) {
        console.error("[LiveHost] start error:", e);
        alert(errorDetails(e, conn, "Hub connect"));
      }
    })();

    return () => {
      try {
        conn.off("RoomUpdated");
        conn.off("CountdownTick");
        conn.off("QuestionStarted");
        conn.off("QuestionTick");
        conn.off("QuestionEnded");
        conn.off("LeaderboardUpdated");
        conn.off("SessionEnded");
        conn.off("SessionError");
        // NEW:
        conn.off("QuestionPaused");
        conn.off("QuestionResumed");
      } finally {
        conn.stop();
      }
    };
  }, []);

  // ---------- existing actions ----------
  async function createRoom() {
    const qid = Number(quizId);
    if (!Number.isInteger(qid) || qid <= 0) { alert("quizId must be a valid number"); return; }
    try {
      const c = await ensureConnected();
      const code = await c.invoke("CreateRoom", Number(quizId), Number(timePerQ), Number(countdown));
      setRoomCode(code);
      await c.invoke("Join", code); // host subscribes to broadcasts
    } catch (e) {
      console.error("[LiveHost] CreateRoom error:", e);
      alert(errorDetails(e, connRef.current, "CreateRoom"));
    }
  }

  async function startRoom() {
    try {
      const c = await ensureConnected();
      await c.invoke("Start", roomCode);
    } catch (e) {
      console.error("[LiveHost] Start error:", e);
      alert(errorDetails(e, connRef.current, "Start"));
    }
  }

  // ---------- NEW: moderation actions ----------
  async function pauseRoom() {
    try {
      const c = await ensureConnected();
      await c.invoke("Pause", roomCode);
    } catch (e) {
      console.error("[LiveHost] Pause error:", e);
      alert(errorDetails(e, connRef.current, "Pause"));
    }
  }

  async function resumeRoom() {
    try {
      const c = await ensureConnected();
      await c.invoke("Resume", roomCode);
    } catch (e) {
      console.error("[LiveHost] Resume error:", e);
      alert(errorDetails(e, connRef.current, "Resume"));
    }
  }

  async function skipQuestion() {
    try {
      const c = await ensureConnected();
      await c.invoke("Skip", roomCode);
    } catch (e) {
      console.error("[LiveHost] Skip error:", e);
      alert(errorDetails(e, connRef.current, "Skip"));
    }
  }

  async function extendTime(sec = 10) {
    try {
      const c = await ensureConnected();
      await c.invoke("ExtendTime", roomCode, Number(sec));
    } catch (e) {
      console.error("[LiveHost] ExtendTime error:", e);
      alert(errorDetails(e, connRef.current, "ExtendTime"));
    }
  }

  async function lockRoom(val) {
    try {
      const c = await ensureConnected();
      await c.invoke("Lock", roomCode, !!val); // true=lock, false=unlock
    } catch (e) {
      console.error("[LiveHost] Lock error:", e);
      alert(errorDetails(e, connRef.current, val ? "Lock" : "Unlock"));
    }
  }

  async function stopRoom() {
    try {
      const c = await ensureConnected();
      await c.invoke("Stop", roomCode);
    } catch (e) {
      console.error("[LiveHost] Stop error:", e);
      alert(errorDetails(e, connRef.current, "Stop"));
    }
  }

  async function kickUser(username) {
    try {
      const c = await ensureConnected();
      await c.invoke("Kick", roomCode, username);
    } catch (e) {
      console.error("[LiveHost] Kick error:", e);
      alert(errorDetails(e, connRef.current, `Kick(${username})`));
    }
  }

  return (
    <div className="page">
      <h2 className="heading">Live Host <span className="pill">{paused ? "Paused" : status}</span></h2>

      {/* TOP BAR */}
      <div className="panel toolbar">
        <input className="input" placeholder="quizId" value={quizId} onChange={e=>setQuizId(e.target.value)} />
        <input className="input" placeholder="sec/question" type="number" value={timePerQ} onChange={e=>setTimePerQ(e.target.value)} />
        <input className="input" placeholder="countdown sec" type="number" value={countdown} onChange={e=>setCountdown(e.target.value)} />
        <button className="btn" onClick={createRoom}>Create Room</button>
        <button className="btn" onClick={startRoom} disabled={!roomCode}>Start</button>

        {/* Moderation controls */}
        {roomCode && (
          <>
            <button className="btn btn--outline" onClick={pauseRoom} disabled={paused || status !== "Question"}>Pause</button>
            <button className="btn" onClick={resumeRoom} disabled={!paused}>Resume</button>
            <button className="btn btn--outline" onClick={skipQuestion} disabled={status !== "Question"}>Skip</button>
            <button className="btn" onClick={()=>extendTime(10)} disabled={status !== "Question"}>+10s</button>
            <button className="btn btn--outline" onClick={()=>lockRoom(true)}>Lock</button>
            <button className="btn btn--outline" onClick={()=>lockRoom(false)}>Unlock</button>
            <button className="btn" onClick={stopRoom}>Stop</button>
          </>
        )}
      </div>

      <div className="statusbar">
        <b>Room:</b> {roomCode || "(none)"} &nbsp; | &nbsp;
        <b>Status:</b> {paused ? "Paused" : status} &nbsp; | &nbsp;
        <b>Seconds left:</b> {qSeconds ?? "-"}
      </div>

      <div className="columns">
        {/* Participants */}
        <div className="col panel">
          <h4 className="panel__title">Participants</h4>
          <ul className="list">
            {participants.map(p => {
              const uname = p.Username || p.username;
              const score = (p.Score ?? p.score) ?? 0;
              return (
                <li key={uname}>
                  {uname} — {score}
                  <button
                    className="btn btn--outline inline kick-btn"
                    onClick={() => kickUser(uname)}
                    title="Remove from room"
                  >
                    Kick
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Current Question */}
        <div className="col panel">
          <h4 className="panel__title">Current Question</h4>
          {question ? (
            <>
              <div><b>{question.text}</b></div>
              {(question.options||[]).map(o => <div key={o.id}>• {o.text}</div>)}
            </>
          ) : <i className="italic muted">(none)</i>}
          <h4 className="panel__title mt-12">Last Correct</h4>
          {lastCorrect ? (
            lastCorrect.type === 3
              ? <div>Text: {lastCorrect.textAnswer}</div>
              : <div>Options: {(lastCorrect.optionTexts||[]).join(", ")}</div>
          ) : <i className="italic muted">(none)</i>}
        </div>

        {/* Leaderboard */}
        <div className="col panel">
          <h4 className="panel__title">Leaderboard</h4>
          <ol className="leaderboard">
            {(leaderboard||[]).map(r => (
              <li key={r.Username||r.username}>
                {(r.Username||r.username)}: {(r.Score??r.score)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
