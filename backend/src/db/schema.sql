CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    creator_id TEXT,
    creator_name TEXT,
    pin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_moderator_created BOOLEAN DEFAULT 0,
    creator_id TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    fingerprint_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE(question_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    creator_id TEXT,
    status TEXT DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS feedback_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    fingerprint_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES feedback(id),
    UNIQUE(feedback_id, user_id)
);

CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    creator_id TEXT,
    pin TEXT NOT NULL,
    results_visibility TEXT DEFAULT 'pin_only',
    participant_pin TEXT
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL,
    options_json TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS survey_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    fingerprint_hash TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    UNIQUE(survey_id, user_id)
);

CREATE TABLE IF NOT EXISTS survey_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    value_json TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES survey_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_campaign ON questions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_votes_question ON votes(question_id);
CREATE INDEX IF NOT EXISTS idx_comments_question ON comments(question_id);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback ON feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_survey ON survey_submissions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_submission ON survey_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON survey_answers(question_id);

