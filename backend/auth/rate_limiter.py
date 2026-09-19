import time
from threading import Lock
from fastapi import HTTPException, status


class RateLimiter:
    """Thread-safe in-memory rate limiter and account lockout manager."""

    def __init__(self):
        self._lock = Lock()
        # Failed login attempts: { "ip:username": [timestamp1, timestamp2, ...] }
        self._failed_logins: dict[str, list[float]] = {}
        # Active lockouts: { "ip:username": lockout_expiry_timestamp }
        self._lockouts: dict[str, float] = {}
        # Prediction requests: { user_id: [timestamp1, timestamp2, ...] }
        self._predict_requests: dict[int, list[float]] = {}

        # Configuration
        self.MAX_LOGIN_FAILURES = 5
        self.LOGIN_FAIL_WINDOW = 300  # 5 minutes
        self.LOCKOUT_DURATION = 900   # 15 minutes
        self.MAX_PREDICTS_PER_MINUTE = 10
        self.PREDICT_WINDOW = 60      # 1 minute

    def _login_key(self, ip: str, username: str) -> str:
        return f"{ip}:{username.strip().lower()}"

    def check_login_allowed(self, ip: str, username: str) -> None:
        """Raises HTTPException 429 if the user/IP is currently locked out."""
        key = self._login_key(ip, username)
        now = time.time()

        with self._lock:
            # Check if currently locked out
            if key in self._lockouts:
                expiry = self._lockouts[key]
                if now < expiry:
                    remaining_minutes = int((expiry - now) // 60) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many failed login attempts. Access locked for {remaining_minutes} minute(s).",
                    )
                else:
                    # Lockout expired
                    del self._lockouts[key]
                    self._failed_logins.pop(key, None)

    def record_login_failure(self, ip: str, username: str) -> None:
        """Records a failed login attempt and applies a lockout if threshold is reached."""
        key = self._login_key(ip, username)
        now = time.time()

        with self._lock:
            attempts = self._failed_logins.setdefault(key, [])
            # Filter attempts older than the window
            attempts = [t for t in attempts if now - t < self.LOGIN_FAIL_WINDOW]
            attempts.append(now)
            self._failed_logins[key] = attempts

            if len(attempts) >= self.MAX_LOGIN_FAILURES:
                self._lockouts[key] = now + self.LOCKOUT_DURATION
                self._failed_logins.pop(key, None)

    def record_login_success(self, ip: str, username: str) -> None:
        """Clears failed attempts and lockouts upon a successful authentication."""
        key = self._login_key(ip, username)
        with self._lock:
            self._failed_logins.pop(key, None)
            self._lockouts.pop(key, None)

    def check_predict_rate_limit(self, user_id: int) -> None:
        """Enforces a maximum rate on predictions per user."""
        now = time.time()
        with self._lock:
            history = self._predict_requests.setdefault(user_id, [])
            # Filter out requests older than the window
            history = [t for t in history if now - t < self.PREDICT_WINDOW]
            if len(history) >= self.MAX_PREDICTS_PER_MINUTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Maximum 10 predictions per minute permitted.",
                )
            history.append(now)
            self._predict_requests[user_id] = history


# Global singleton instance
limiter = RateLimiter()
