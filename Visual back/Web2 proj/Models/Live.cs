using System;
using System.Collections.Concurrent;
using System.Collections.Generic;


namespace Web2_proj.Models
{
    public enum LiveRoomStatus
    {
        Lobby = 0,
        Countdown = 1,
        Question = 2,
        BetweenQuestions = 3,
        Finished = 4
    }

    public class QuestionSnapshot
    {
        public int Id { get; set; }
        public int Type { get; set; }          
        public string Text { get; set; }       
        public string CorrectTextAnswer { get; set; }
        public List<(int id, string text, bool isCorrect)> Options { get; set; } = new();
    }

    public class LiveUserAnswer
    {
        public int QuestionId { get; set; }
        public List<int> SelectedOptionIds { get; set; } = new();
        public string UserTextAnswer { get; set; }
        public bool IsCorrect { get; set; }
        public int Points { get; set; }
        public DateTime SubmittedUtc { get; set; }
    }   

    public class LiveParticipant
    {
        public string Username { get; set; }
        public string ConnectionId { get; set; }
        public int Score { get; set; } = 0;
        public bool IsConnected { get; set; } = true;
    }

    public class LiveAnswerPayload
    {
        // For options-based questions
        public List<int> SelectedOptionIds { get; set; } = new();

        // For text questions
        public string UserTextAnswer { get; set; }
    }

    public class LiveRoomState
    {
        public ConcurrentDictionary<string, Dictionary<int, LiveUserAnswer>> Submissions { get; } =
        new ConcurrentDictionary<string, Dictionary<int, LiveUserAnswer>>(StringComparer.OrdinalIgnoreCase);

        //------------------------------------------------------------------------------------------

        public bool IsLocked { get; set; } = false;
        public HashSet<string> Kicked { get; } = new(StringComparer.OrdinalIgnoreCase);

        // Pause/Resume
        public bool IsPaused { get; set; } = false;
        public int? PauseSecondsLeft { get; set; } // set while paused

        // Make ticking easier to control
        public DateTime? QuestionEndsUtc { get; set; } // set when question starts/resumes

        // Late-join countdown sync (you already added this earlier)
        public DateTime? CountdownStartedUtc { get; set; }

        //------------------------------------------------------------------------------------------

        public string RoomCode { get; set; }
        public int QuizId { get; set; }
        public string CreatedBy { get; set; }
        public LiveRoomStatus Status { get; set; } = LiveRoomStatus.Lobby;              
        public int CountdownBeforeStartSec { get; set; } = 5;
        public int QuestionDurationSec { get; set; } = 30;
        public List<QuestionSnapshot> Questions { get; set; } = new();
        public List<object> LastLeaderboard { get; set; } = new();

        // Progress
        public int CurrentQuestionIndex { get; set; } = -1;
        public DateTime QuestionStartUtc { get; set; }

        // Participants and guard sets
        public ConcurrentDictionary<string, LiveParticipant> Participants { get; } =
            new ConcurrentDictionary<string, LiveParticipant>(StringComparer.OrdinalIgnoreCase);

        // Users who submitted an answer for the current question
        public HashSet<string> AnsweredThisQuestion { get; } =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Cancellation for the running session loop
        public System.Threading.CancellationTokenSource Cts { get; set; }

        public object Sync { get; } = new object();
    }


}

