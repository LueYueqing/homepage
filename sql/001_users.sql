CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wechat_openid VARCHAR(64) NOT NULL,
  wechat_unionid VARCHAR(64) NULL,
  nickname VARCHAR(64) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) NOT NULL DEFAULT '',
  bg_url VARCHAR(512) NOT NULL DEFAULT '',
  bg_category VARCHAR(32) NOT NULL DEFAULT '',
  nav_categories JSON NULL,
  ui_settings JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_wechat_openid (wechat_openid),
  KEY idx_wechat_unionid (wechat_unionid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_token_hash (token_hash),
  KEY idx_user_id (user_id),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_backgrounds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  object_key VARCHAR(255) NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NOT NULL DEFAULT '2000-01-01 00:00:00',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_object_key (object_key),
  KEY idx_user_used (user_id, last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
