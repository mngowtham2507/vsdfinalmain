CREATE TABLE IF NOT EXISTS blog_posts (
  slug text PRIMARY KEY,
  title varchar(160) NOT NULL,
  category varchar(60) NOT NULL,
  excerpt varchar(400) NOT NULL,
  body text NOT NULL,
  image_url text,
  read_minutes integer NOT NULL CHECK (read_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id smallint PRIMARY KEY CHECK (id = 1),
  email text NOT NULL UNIQUE,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
