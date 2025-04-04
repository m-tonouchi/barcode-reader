const APP_CONFIG = {
    version: {
        major: 1,
        minor: 0,
        // 2025年4月4日の場合: 20250404
        patch: new Date().getFullYear() * 10000 + 
              (new Date().getMonth() + 1) * 100 + 
              new Date().getDate()
    },
    getFullVersion() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }
};