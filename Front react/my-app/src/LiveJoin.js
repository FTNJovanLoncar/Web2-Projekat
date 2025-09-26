import { useEffect, useRef, useState } from "react";
import { HubConnectionState, LogLevel } from "@microsoft/signalr";
import { newLiveConnection } from "./realtime";
import { getJwt } from "./auth";
import "./LiveJoin.css";

function errorDetails(err, conn, context) {
  const parts = [`${context} failed`];

  // Try common shapes first
  let msg =
    (err && (err.error || err.message)) ??
    (typeof err === "string" ? err : null);

  if (!msg && err) {
    try { msg = JSON.stringify(err); } catch { /* ignore */ }
  }
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

export default function LiveJoin() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Lobby");
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null);
  const [qSeconds, setQSeconds] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [textAns, setTextAns] = useState("");

  const connRef = useRef(null);

  useEffect(() => {
    const jwt = getJwt();
    if (!jwt) { alert("Login first."); return; }

    const conn = newLiveConnection({ logging: LogLevel.Information });
    connRef.current = conn;

    // lifecycle diagnostics
    conn.onclose((e) => {
      if (e) console.error("[LiveJoin] connection closed with error:", e);
      else console.warn("[LiveJoin] connection closed.");
    });
    conn.onreconnecting((e) => console.warn("[LiveJoin] reconnecting...", e));
    conn.onreconnected((id) => console.info("[LiveJoin] reconnected, id:", id));

    conn.on("RoomUpdated", (m) => {
      setStatus(m.status ?? m.Status ?? "");
      setParticipants(m.participants ?? m.Participants ?? []);
    });
    conn.on("CountdownTick", (m) => setQSeconds(m.secondsLeft));
    conn.on("QuestionStarted", (m) => {
      setQuestion(m.question);
      setQSeconds(null);
      setAccepted(null);
      setSelectedIds([]);
      setTextAns("");
    });
    conn.on("QuestionTick", (m) => setQSeconds(m.secondsLeft));
    conn.on("AnswerAccepted", (m) => setAccepted(m));
    conn.on("QuestionEnded", (m) => {
      setQuestion(null);
      setQSeconds(null);
      setLeaderboard(m.leaderboard ?? []);
      setSelectedIds([]);
      setTextAns("");
    });
    conn.on("LeaderboardUpdated", (m) => setLeaderboard(m.leaderboard ?? []));
    conn.on("SessionEnded", () => setStatus("Finished"));
    conn.on("SessionError", (e) => {
      console.error("[LiveJoin] SessionError:", e);
      alert(errorDetails(e, conn, "Session"));
    });

    (async () => {
      try {
        if (conn.state === HubConnectionState.Disconnected) {
          await conn.start();
          console.info("[LiveJoin] hub started");
        }
      } catch (e) {
        console.error("[LiveJoin] start error:", e);
        alert(errorDetails(e, conn, "Hub connect"));
      }
    })();

    return () => {
      try {
        conn.off("RoomUpdated");
        conn.off("CountdownTick");
        conn.off("QuestionStarted");
        conn.off("QuestionTick");
        conn.off("AnswerAccepted");
        conn.off("QuestionEnded");
        conn.off("LeaderboardUpdated");
        conn.off("SessionEnded");
        conn.off("SessionError");
      } finally {
        conn.stop();
      }
    };
  }, []);

  async function join() {
    const c = connRef.current;
    try {
      if (c.state !== HubConnectionState.Connected) {
        if (c.state === HubConnectionState.Disconnected) await c.start();
        else throw new Error("Connection not ready");
      }
      await c.invoke("Join", roomCode);
      setJoined(true);
    } catch (e) {
      console.error("[LiveJoin] Join error:", e);
      alert(errorDetails(e, c, "Join"));
    }
  }

  async function submit() {
    if (!question) return;
    const payload = (question.type === 3)
      ? { UserTextAnswer: textAns }
      : { SelectedOptionIds: selectedIds };
    const c = connRef.current;
    try {
      if (c.state !== HubConnectionState.Connected) {
        if (c.state === HubConnectionState.Disconnected) await c.start();
        else throw new Error("Connection not ready");
      }
      await c.invoke("SubmitAnswer", roomCode, question.id, payload);
    } catch (e) {
      console.error("[LiveJoin] Submit error:", e);
      alert(errorDetails(e, c, "SubmitAnswer"));
    }
  }

  function toggle(id) {
    if (!question) return;
    if (question.type === 1) {
      setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelectedIds([id]);
    }
  }

  return (
    <div className="page">
      <h2 className="heading">Live Join <span className="pill">{status}</span></h2>

      {!joined ? (
        <div className="panel join-bar">
          <input className="input" placeholder="Room code" value={roomCode} onChange={e=>setRoomCode(e.target.value.trim())} />
          <button className="btn" onClick={join}>Join</button>
          <div className="muted">
            <b>Status:</b> {status} &nbsp; | &nbsp;
            <b>Seconds:</b> {qSeconds ?? "-"} &nbsp; | &nbsp;
            <b>Players:</b> {participants.length}
          </div>
        </div>
      ) : (
        <>
          <div className="statusbar">
            <b>Status:</b> {status} &nbsp; | &nbsp; <b>Seconds:</b> {qSeconds ?? "-"}
          </div>

          <div className="columns">
            <div className="col panel">
              <h4 className="panel__title">Question</h4>
              {question ? (
                <>
                  <div><b>{question.text}</b></div>
                  {question.type === 3 ? (
                    <input
                      className="input mt-8"
                      value={textAns}
                      onChange={e=>setTextAns(e.target.value)}
                      placeholder="Type your answer"
                    />
                  ) : (
                    <div className="answer-block">
                      {(question.options||[]).map(o => (
                        <label key={o.id} className="answer-option">
                          <input
                            type={question.type === 1 ? "checkbox" : "radio"}
                            name={`q-${question.id}`}
                            checked={selectedIds.includes(o.id)}
                            onChange={()=>toggle(o.id)}
                          /> {o.text}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="mt-8">
                    <button className="btn" onClick={submit} disabled={!!accepted}>Submit</button>
                    {accepted && (
                      <span className="accepted-pill pill">
                        {accepted.isCorrect ? "✅ Correct" : "❌ Incorrect"} &nbsp; +{accepted.pointsAwarded} pts
                      </span>
                    )}
                  </div>
                </>
              ) : <i className="italic muted">(waiting)</i>}
            </div>

            <div className="col panel">
              <h4 className="panel__title">Leaderboard</h4>
              <ol className="leaderboard">{(leaderboard||[]).map(r => (
                <li key={r.Username||r.username}>{(r.Username||r.username)}: {(r.Score??r.score)}</li>
              ))}</ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
