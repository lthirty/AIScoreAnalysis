CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  openid TEXT NOT NULL UNIQUE,
  unionid TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city TEXT,
  grade TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  grade TEXT NOT NULL,
  exam_date DATE NOT NULL,
  total_score NUMERIC(8, 2),
  class_rank INTEGER,
  grade_rank INTEGER,
  max_total_score NUMERIC(8, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_subject_scores (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT NOT NULL REFERENCES exam_records(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score NUMERIC(8, 2) NOT NULL,
  full_score NUMERIC(8, 2),
  max_score NUMERIC(8, 2),
  exam_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_reports (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES exam_records(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  prompt_hash TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subject_analysis_materials (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES exam_records(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  mode TEXT NOT NULL,
  file_url TEXT,
  detail_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  request_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_openid_uidx ON users(openid);
CREATE INDEX IF NOT EXISTS exam_records_user_date_idx ON exam_records(user_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS exam_subject_scores_user_subject_date_idx ON exam_subject_scores(user_id, subject, exam_date);
CREATE INDEX IF NOT EXISTS analysis_reports_record_type_idx ON analysis_reports(record_id, report_type);
CREATE INDEX IF NOT EXISTS ai_jobs_user_status_idx ON ai_jobs(user_id, status, created_at DESC);
