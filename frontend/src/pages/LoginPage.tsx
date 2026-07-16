import "./LoginPage.css";

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-app">
        <header className="login-header">
          <div className="login-header-left">
            <a href="#" className="login-brand">
              <div className="login-brand-icon" />
              <div className="login-brand-text">
                Agent<span>Forge</span>
              </div>
            </a>
            <nav className="login-nav-links">
              <a href="#" className="login-nav-link">
                产品功能
              </a>
              <a href="#" className="login-nav-link">
                模板市场
              </a>
              <a href="#" className="login-nav-link">
                文档
              </a>
              <a href="#" className="login-nav-link">
                定价
              </a>
            </nav>
          </div>
          <div className="login-header-right">
            <a href="#" className="login-link">
              登录
            </a>
            <div className="login-btn-border-wrap">
              <button className="login-btn login-btn-join">免费试用</button>
            </div>
          </div>
        </header>

        <section className="login-hero">
          <div className="login-hero-left">
            <div className="login-card">
              <h1 className="login-title">欢迎回来</h1>
              <p className="login-subtitle">
                登录你的 Agent 工作台，继续构建智能体
              </p>

              <form onSubmit={(e) => e.preventDefault()}>
                <div className="login-form-group">
                  <label className="login-form-label" htmlFor="email">
                    邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="login-form-input"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="login-form-group">
                  <label className="login-form-label" htmlFor="password">
                    密码
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="login-form-input"
                    placeholder="输入密码"
                    required
                  />
                </div>

                <div className="login-form-options">
                  <label className="login-remember-me">
                    <input type="checkbox" defaultChecked />
                    <span>记住我</span>
                  </label>
                  <a href="#" className="login-forgot-link">
                    忘记密码？
                  </a>
                </div>

                <button type="submit" className="login-btn-login">
                  登录
                </button>
              </form>

              <div className="login-divider">或使用以下方式</div>

              <div className="login-social-login">
                <button className="login-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
                <button className="login-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

              <p className="login-signup-text">
                还没有账号？<a href="#">立即注册</a>
              </p>
            </div>
          </div>

          <div className="login-hero-right">
            <div className="login-orbits-container">
              <div className="login-center-hub">
                <a
                  href="https://github.com"
                  target="_blank"
                  className="login-github-link"
                  aria-label="在 GitHub 查看"
                  rel="noreferrer"
                >
                  <svg
                    className="login-github-icon"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span className="login-github-tooltip">在 GitHub 上查看</span>
                </a>
              </div>

              {/* Orbit 4 */}
              <div className="login-orbit login-orbit-4">
                <div className="login-orbit-border" />
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(30deg) translate(399px) rotate(-30deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-purple"
                    style={{ animationDelay: "0.6s", width: 52, height: 52 }}
                  >
                    <div
                      className="login-planet-ring"
                      style={{
                        width: 72,
                        height: 28,
                        transform: "translate(-50%, -50%) rotate(25deg)",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(95deg) translate(399px) rotate(-95deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-orange"
                    style={{ animationDelay: "0.9s", width: 72, height: 72 }}
                  >
                    <div
                      className="login-planet-ring"
                      style={{
                        width: 100,
                        height: 36,
                        transform: "translate(-50%, -50%) rotate(-15deg)",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(220deg) translate(399px) rotate(-220deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-pink"
                    style={{ animationDelay: "1.2s", width: 64, height: 64 }}
                  />
                </div>
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(320deg) translate(399px) rotate(-320deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-cyan"
                    style={{ animationDelay: "1.5s", width: 48, height: 48 }}
                  />
                </div>
              </div>

              {/* Orbit 3 */}
              <div className="login-orbit login-orbit-3">
                <div className="login-orbit-border" />
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(130deg) translate(325px) rotate(-130deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-red"
                    style={{ animationDelay: "1.8s", width: 68, height: 68 }}
                  >
                    <div
                      className="login-planet-ring"
                      style={{
                        width: 90,
                        height: 32,
                        transform: "translate(-50%, -50%) rotate(40deg)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Orbit 2 */}
              <div className="login-orbit login-orbit-2">
                <div className="login-orbit-border" />
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(60deg) translate(251px) rotate(-60deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-yellow"
                    style={{ animationDelay: "2.0s", width: 56, height: 56 }}
                  />
                </div>
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(180deg) translate(251px) rotate(-180deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-pink"
                    style={{ animationDelay: "2.1s", width: 76, height: 76 }}
                  >
                    <div
                      className="login-planet-ring"
                      style={{
                        width: 100,
                        height: 38,
                        transform: "translate(-50%, -50%) rotate(10deg)",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(300deg) translate(251px) rotate(-300deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-blue"
                    style={{ animationDelay: "2.2s", width: 54, height: 54 }}
                  />
                </div>
              </div>

              {/* Orbit 1 */}
              <div className="login-orbit login-orbit-1">
                <div className="login-orbit-border" />
                <div
                  className="login-orbit-item"
                  style={{
                    transform:
                      "translate(-50%, -50%) rotate(270deg) translate(177px) rotate(-270deg)",
                  }}
                >
                  <div
                    className="login-planet login-planet-green"
                    style={{ animationDelay: "2.3s", width: 58, height: 58 }}
                  >
                    <div
                      className="login-planet-ring"
                      style={{
                        width: 80,
                        height: 30,
                        transform: "translate(-50%, -50%) rotate(-20deg)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
