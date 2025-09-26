using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Web2_proj.Hubs;
using Web2_proj.Infrastructure;
using Web2_proj.Interfaces;
using Web2_proj.Models;
using System.Collections.Generic;


namespace Web2_proj.Services
{
    public class LiveQuiz : ILiveQuiz
    {
        private readonly IDbContextFactory<DbContextt> _dbFactory;
        private readonly IHubContext<LiveQuizHub> _hub;

        // roomCode -> state
        private static readonly ConcurrentDictionary<string, LiveRoomState> _rooms =
            new ConcurrentDictionary<string, LiveRoomState>(StringComparer.OrdinalIgnoreCase);

        public LiveQuiz(IDbContextFactory<DbContextt> dbFactory, IHubContext<LiveQuizHub> hub)
        {
            _dbFactory = dbFactory;
            _hub = hub;
        }

        public string CreateRoom(int quizId, string createdBy, int timePerQuestionSec, int countdownSec)
        {
            // Validate quiz exists
            using var db = _dbFactory.CreateDbContext();
            var quizExists = db.Quizs.Any(q => q.Id == quizId);
            if (!quizExists) throw new InvalidOperationException($"Quiz {quizId} not found.");

            var code = GenerateRoomCode();
            var state = new LiveRoomState
            {
                RoomCode = code,
                QuizId = quizId,
                CreatedBy = createdBy,
                QuestionDurationSec = Math.Max(5, timePerQuestionSec),
                CountdownBeforeStartSec = Math.Max(3, countdownSec)
            };
            _rooms[code] = state;
            return code;
        }

        public async Task JoinAsync(string roomCode, string username, string connectionId)
        {
            if (!_rooms.TryGetValue(roomCode, out var room))
                throw new InvalidOperationException("Room not found.");

            if (room.IsLocked)
                throw new InvalidOperationException("Room is locked.");

            if (room.Kicked.Contains(username))
                throw new InvalidOperationException("You have been removed from this room.");            

            room.Participants.AddOrUpdate(username,
                addValueFactory: _ => new LiveParticipant
                {
                    Username = username,
                    ConnectionId = connectionId,
                    IsConnected = true
                },
                updateValueFactory: (_, existing) =>
                {
                    existing.ConnectionId = connectionId;
                    existing.IsConnected = true;
                    return existing;
                });

            await BroadcastRoomUpdated(room);

            if (room.Status == LiveRoomStatus.Countdown && room.CountdownStartedUtc.HasValue)
            {
                var elapsed = (int)Math.Floor((DateTime.UtcNow - room.CountdownStartedUtc.Value).TotalSeconds);
                var left = Math.Max(0, room.CountdownBeforeStartSec - elapsed);
                await _hub.Clients.Client(connectionId).SendAsync("CountdownTick", new
                {
                    room.RoomCode,
                    secondsLeft = left
                });
            }
            else if (room.Status == LiveRoomStatus.Question && room.CurrentQuestionIndex >= 0)
            {
                var snap = room.Questions[room.CurrentQuestionIndex];
                var endsAt = room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);
                var secLeft = Math.Max(0, (int)Math.Ceiling((endsAt - DateTime.UtcNow).TotalSeconds));

                await _hub.Clients.Client(connectionId).SendAsync("QuestionStarted", new
                {
                    room.RoomCode,
                    question = new
                    {
                        id = snap.Id,
                        text = snap.Text,               // now available
                        type = snap.Type,
                        options = snap.Options.Select(o => new { id = o.id, text = o.text })
                    },
                    endsAtUtc = endsAt
                });

                await _hub.Clients.Client(connectionId).SendAsync("QuestionTick", new
                {
                    room.RoomCode,
                    secondsLeft = secLeft
                });
            }

            // Give them the latest board too (if any)
            if (room.LastLeaderboard != null && room.LastLeaderboard.Count > 0)
            {
                await _hub.Clients.Client(connectionId).SendAsync("LeaderboardUpdated", new
                {
                    room.RoomCode,
                    leaderboard = room.LastLeaderboard
                });
            }
        }

        public async Task LeaveAsync(string roomCode, string username, string connectionId)
        {
            if (!_rooms.TryGetValue(roomCode, out var room))
                return;

            if (room.Participants.TryGetValue(username, out var p) && p.ConnectionId == connectionId)
            {
                p.IsConnected = false;
                await BroadcastRoomUpdated(room);
            }
        }

        public async Task StartAsync(string roomCode, ClaimsPrincipal startedBy)
        {
            if (!_rooms.TryGetValue(roomCode, out var room))
                throw new InvalidOperationException("Room not found.");

            // Only admin may start
            if (!startedBy.IsInRole("admin"))
                throw new UnauthorizedAccessException("Only admin can start the session.");

            if (room.Status != LiveRoomStatus.Lobby)
                throw new InvalidOperationException("Room already started.");

            // Start loop
            room.Cts?.Cancel();
            room.Cts = new CancellationTokenSource();
            _ = RunRoomLoopAsync(room, room.Cts.Token);
            await Task.CompletedTask;
        }

        public async Task SubmitAnswerAsync(string roomCode, string username, int questionId, LiveAnswerPayload payload)
        {
            if (!_rooms.TryGetValue(roomCode, out var room))
                throw new InvalidOperationException("Room not found.");

            if (room.IsPaused) return;
            QuestionSnapshot currQ;
            DateTime endsAt;
            int duration;

            lock (room.Sync)
            {
                if (room.Status != LiveRoomStatus.Question)
                {
                    // Not accepting answers right now
                    return;
                }

                // Time window check
                duration = room.QuestionDurationSec;
                endsAt = room.QuestionStartUtc.AddSeconds(duration);
                if (DateTime.UtcNow >= endsAt)
                {
                    return; // late
                }

                // Only one submission per user per question
                if (!room.AnsweredThisQuestion.Add(username))
                {
                    return; // duplicate
                }

                // Get current question snapshot (by index or by id)
                currQ = room.Questions.FirstOrDefault(q => q.Id == questionId);
                if (currQ == null)
                {
                    return; // unknown question
                }
            }

            // ----- Evaluate correctness (server authoritative) -----
            bool isCorrect = false;

            switch (currQ.Type)
            {
                // SingleChoice4 (0) / MultipleChoice4 (1) / TrueFalse (2)
                case 0:
                case 1:
                case 2:
                    {
                        var correctIds = currQ.Options.Where(o => o.isCorrect).Select(o => o.id).OrderBy(x => x).ToList();
                        var userIds = (payload?.SelectedOptionIds ?? new List<int>()).Distinct().OrderBy(x => x).ToList();
                        isCorrect = correctIds.Count == userIds.Count && correctIds.SequenceEqual(userIds);
                        break;
                    }
                // TextAnswer (3)
                case 3:
                    {
                        var expected = (currQ.CorrectTextAnswer ?? "").Trim().ToLowerInvariant();
                        var actual = (payload?.UserTextAnswer ?? "").Trim().ToLowerInvariant();
                        isCorrect = expected.Length > 0 && expected == actual;
                        break;
                    }
            }

            // ----- Scoring -----
            int points = 0;
            if (isCorrect)
            {
                // base 100 + speed bonus up to 50
                var now = DateTime.UtcNow;
                var secondsLeft = Math.Max(0, (int)Math.Ceiling((endsAt - now).TotalSeconds));
                var bonus = (int)Math.Floor((secondsLeft / (double)duration) * 50.0);
                points = 100 + bonus;
            }

            // Update participant score
            if (room.Participants.TryGetValue(username, out var p))
            {
                p.Score += points;
            }

            lock (room.Sync)
            {
                if (!room.Submissions.TryGetValue(username, out var map))
                {
                    map = new Dictionary<int, LiveUserAnswer>();
                    room.Submissions[username] = map;
                }

                map[questionId] = new LiveUserAnswer
                {
                    QuestionId = questionId,
                    SelectedOptionIds = payload?.SelectedOptionIds?.ToList() ?? new List<int>(),
                    UserTextAnswer = payload?.UserTextAnswer,
                    IsCorrect = isCorrect,
                    Points = points,
                    SubmittedUtc = DateTime.UtcNow
                };
            }

            // Ack only to the caller
            if (room.Participants.TryGetValue(username, out var who) && !string.IsNullOrEmpty(who.ConnectionId))
            {
                await _hub.Clients.Client(who.ConnectionId).SendAsync("AnswerAccepted", new
                {
                    roomCode,
                    questionId,
                    isCorrect,
                    pointsAwarded = points
                });
            }

            // ----- Leaderboard broadcast -----
            await BroadcastLeaderboard(room);
        }

        private async Task BroadcastLeaderboard(LiveRoomState room)
        {
            var board = room.Participants.Values
                .OrderByDescending(p => p.Score)
                .ThenBy(p => p.Username, StringComparer.OrdinalIgnoreCase)
                .Select(p => new { p.Username, p.Score, p.IsConnected })
                .ToList();

            room.LastLeaderboard = board.Cast<object>().ToList();

            await _hub.Clients.Group(room.RoomCode).SendAsync("LeaderboardUpdated", new
            {
                room.RoomCode,
                leaderboard = board
            });
        }


        // ------------------ Internal Loop ------------------

        private async Task RunRoomLoopAsync(LiveRoomState room, CancellationToken ct)
        {
            try
            {
                using var db = _dbFactory.CreateDbContext();
                var quiz = await db.Quizs
                                    .Include(q => q.Questions)
                        .ThenInclude(o => o.Options)
                    .FirstOrDefaultAsync(q => q.Id == room.QuizId, ct);

                if (quiz == null) throw new InvalidOperationException("Quiz not found.");

                // 1) Countdown
                room.Questions = quiz.Questions.Select(q => new QuestionSnapshot
                {
                    Id = q.Id,
                    Type = (int)q.Type,
                    Text = q.Text,
                    CorrectTextAnswer = q.CorrectTextAnswer,
                    Options = q.Options.Select(o => (o.Id, o.Text, o.IsCorrect)).ToList()
                }).ToList();

                room.Status = LiveRoomStatus.Countdown;
                room.CountdownStartedUtc = DateTime.UtcNow;
                await BroadcastRoomUpdated(room);

                for (int remaining = room.CountdownBeforeStartSec; remaining > 0; remaining--)
                {
                    await _hub.Clients.Group(room.RoomCode).SendAsync("CountdownTick", new
                    {
                        room.RoomCode,
                        secondsLeft = remaining
                    }, ct);
                    await Task.Delay(1000, ct);
                }

                // 2) Questions loop
                for (int i = 0; i < quiz.Questions.Count; i++)
                {
                    ct.ThrowIfCancellationRequested();

                    lock (room.Sync)
                    {
                        room.CurrentQuestionIndex = i;
                        room.Status = LiveRoomStatus.Question;
                        room.AnsweredThisQuestion.Clear();
                        room.QuestionStartUtc = DateTime.UtcNow;
                        room.IsPaused = false;
                        room.PauseSecondsLeft = null;
                        room.QuestionEndsUtc = room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);
                    }

                    var q = quiz.Questions[i];
                    var endsAt = room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);

                    // Broadcast question start
                    await _hub.Clients.Group(room.RoomCode).SendAsync("QuestionStarted", new
                    {
                        room.RoomCode,
                        question = new
                        {
                            id = q.Id,
                            text = q.Text,
                            type = (int)q.Type,
                            options = q.Options.Select(o => new { id = o.Id, text = o.Text })
                        },
                        endsAtUtc = endsAt
                    }, ct);

                    // Per-second ticks
                    while (true)
                    {
                        ct.ThrowIfCancellationRequested();
                        DateTime endsAt1;
                        bool paused;
                        lock (room.Sync)
                        {
                            paused = room.IsPaused;
                            endsAt1 = room.QuestionEndsUtc ?? room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);
                        }

                        var secondsLeft = Math.Max(0, (int)Math.Ceiling((endsAt1 - DateTime.UtcNow).TotalSeconds));
                        if (!paused && secondsLeft <= 0) break;

                        await _hub.Clients.Group(room.RoomCode).SendAsync("QuestionTick", new { room.RoomCode, secondsLeft }, ct);

                        // If paused, don’t count down; just sample more frequently
                        await Task.Delay(paused ? 300 : 1000, ct);
                    }

                    // Question ended
                    lock (room.Sync)
                    {
                        room.Status = LiveRoomStatus.BetweenQuestions;
                    }

                    await _hub.Clients.Group(room.RoomCode).SendAsync("QuestionEnded", new
                    {
                        room.RoomCode,
                        questionId = q.Id,
                        correct = new
                        {
                            type = (int)q.Type,
                            textAnswer = q.CorrectTextAnswer,
                            optionIds = q.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToList(),
                            optionTexts = q.Options.Where(o => o.IsCorrect).Select(o => o.Text).ToList()
                        },
                        leaderboard = room.LastLeaderboard
                    }, ct);

                    // Small pause between questions
                    await Task.Delay(1500, ct);
                }

                // 3) Finished
                Dictionary<string, int> answerIds = new(StringComparer.OrdinalIgnoreCase);

                try
                {
                    lock (room.Sync)
                    {
                        room.Status = LiveRoomStatus.Finished;
                    }

                    // Persist one AnswerQuiz per participant so existing pages work
                    using var dbPersist = _dbFactory.CreateDbContext();

                    foreach (var kvp in room.Participants)
                    {
                        var username = kvp.Key;

                        // All answers this user submitted during the session
                        room.Submissions.TryGetValue(username, out var userMap);

                        var aQuiz = new AnswerQuiz
                        {
                            QuizId = room.QuizId,
                            Username = username,
                            Questions = new List<AnswerQuestion>()
                        };

                        foreach (var q in quiz.Questions)
                        {
                            LiveUserAnswer rec = null;
                            if (userMap != null && userMap.TryGetValue(q.Id, out var tmp))
                                rec = tmp;

                            var aQ = new AnswerQuestion
                            {
                                QuestionId = q.Id,
                                // QUICK FIX: never insert NULL into UserTextAnswer
                                UserTextAnswer = q.Type == QuestionType.TextAnswer
                                                 ? (rec?.UserTextAnswer ?? string.Empty)
                                                 : string.Empty,
                                Options = new List<AnswerOption>()
                            };

                            if (q.Type != QuestionType.TextAnswer)
                            {
                                var selected = rec?.SelectedOptionIds ?? new List<int>();
                                foreach (var opt in q.Options)
                                {
                                    aQ.Options.Add(new AnswerOption
                                    {
                                        OptionId = opt.Id,
                                        Selected = selected.Contains(opt.Id)
                                    });
                                }
                            }

                            aQuiz.Questions.Add(aQ);
                        }

                        dbPersist.Answers.Add(aQuiz);
                        await dbPersist.SaveChangesAsync(ct); // get Id
                        answerIds[username] = aQuiz.Id;
                    }

                    // Final event with leaderboard + created AnswerQuiz ids
                    await _hub.Clients.Group(room.RoomCode).SendAsync("SessionEnded", new
                    {
                        room.RoomCode,
                        leaderboard = room.LastLeaderboard,
                        quizId = room.QuizId,
                        answerIds // { username -> answerQuizId }
                    }, ct);
                }
                catch (OperationCanceledException)
                {
                    // ignore, graceful stop
                }
                catch (Exception ex)
                {
                    await _hub.Clients.Group(room.RoomCode).SendAsync("SessionError", new
                    {
                        room.RoomCode,
                        error = ex.ToString()
                    }, ct);
                }
                finally
                {
                    _rooms.TryRemove(room.RoomCode, out _);
                    room.Cts?.Dispose();
                }
            }
            catch (Exception ex)
            {
                try
                {
                    await _hub.Clients.Group(room.RoomCode).SendAsync("SessionError", new
                    {
                        room.RoomCode,
                        error = ex.ToString()
                    });
                }
                catch { /* swallow to avoid crashing the background loop */ }
            }

        }

        // ------------------ Helpers ------------------

        private async Task BroadcastRoomUpdated(LiveRoomState room)
        {
            var participants = room.Participants.Values
                .OrderByDescending(p => p.Score)
                .Select(p => new
                {
                    p.Username,
                    p.Score,
                    p.IsConnected
                })
                .ToList();

            await _hub.Clients.Group(room.RoomCode).SendAsync("RoomUpdated", new
            {
                room.RoomCode,
                room.Status,
                room.QuizId,
                room.CurrentQuestionIndex,
                participants
            });
        }

        private static string GenerateRoomCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var rnd = new Random();
            return new string(Enumerable.Range(0, 6).Select(_ => chars[rnd.Next(chars.Length)]).ToArray());
        }


        //----------------------------------------------------------------------------------------------------

        public Task LockAsync(string roomCode, bool locked)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            room.IsLocked = locked;
            return _hub.Clients.Group(room.RoomCode).SendAsync("RoomUpdated", new { room.RoomCode, room.Status, room.QuizId, room.CurrentQuestionIndex });
        }

        public async Task KickAsync(string roomCode, string username)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            room.Kicked.Add(username);

            if (room.Participants.TryGetValue(username, out var p) && !string.IsNullOrEmpty(p.ConnectionId))
            {
                try
                {
                    await _hub.Clients.Client(p.ConnectionId).SendAsync("Kicked", new { room.RoomCode });
                    await _hub.Groups.RemoveFromGroupAsync(p.ConnectionId, room.RoomCode);
                }
                catch { /* best-effort */ }

                p.IsConnected = false;
            }

            await BroadcastRoomUpdated(room);
        }

        public Task PauseAsync(string roomCode)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            lock (room.Sync)
            {
                if (room.Status != LiveRoomStatus.Question || room.IsPaused) return Task.CompletedTask;
                var ends = room.QuestionEndsUtc ?? room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);
                var left = Math.Max(0, (int)Math.Ceiling((ends - DateTime.UtcNow).TotalSeconds));
                room.IsPaused = true;
                room.PauseSecondsLeft = left;
            }
            return _hub.Clients.Group(room.RoomCode).SendAsync("QuestionPaused", new { room.RoomCode });
        }

        public Task ResumeAsync(string roomCode)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            lock (room.Sync)
            {
                if (room.Status != LiveRoomStatus.Question || !room.IsPaused) return Task.CompletedTask;
                var left = room.PauseSecondsLeft ?? room.QuestionDurationSec;
                room.QuestionStartUtc = DateTime.UtcNow;
                room.QuestionEndsUtc = DateTime.UtcNow.AddSeconds(left);
                room.IsPaused = false;
                room.PauseSecondsLeft = null;
            }
            return _hub.Clients.Group(room.RoomCode).SendAsync("QuestionResumed", new { room.RoomCode });
        }

        public Task SkipAsync(string roomCode)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            lock (room.Sync)
            {
                if (room.Status == LiveRoomStatus.Question)
                {
                    room.QuestionEndsUtc = DateTime.UtcNow; // force loop to end the question
                }
            }
            return Task.CompletedTask;
        }

        public Task ExtendTimeAsync(string roomCode, int extraSeconds)
        {
            if (extraSeconds <= 0) return Task.CompletedTask;
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            lock (room.Sync)
            {
                if (room.Status == LiveRoomStatus.Question && !room.IsPaused)
                {
                    var ends = room.QuestionEndsUtc ?? room.QuestionStartUtc.AddSeconds(room.QuestionDurationSec);
                    room.QuestionEndsUtc = ends.AddSeconds(extraSeconds);
                }
                else if (room.Status == LiveRoomStatus.Question && room.IsPaused)
                {
                    room.PauseSecondsLeft = (room.PauseSecondsLeft ?? 0) + extraSeconds;
                }
            }
            return _hub.Clients.Group(room.RoomCode).SendAsync("QuestionTick", new
            {
                room.RoomCode,
                secondsLeft = Math.Max(0, (int)Math.Ceiling(((room.QuestionEndsUtc ?? DateTime.UtcNow) - DateTime.UtcNow).TotalSeconds))
            });
        }

        public Task StopAsync(string roomCode)
        {
            if (!_rooms.TryGetValue(roomCode, out var room)) throw new InvalidOperationException("Room not found.");
            room.Cts?.Cancel(); // loop catches OperationCanceledException; our Phase 6 already sends SessionError/Ended safely
            return Task.CompletedTask;
        }

    }
}
