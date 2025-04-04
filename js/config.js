const APP_CONFIG = {
    version: {
        major: 1,
        minor: 0,
        patch: 202504041704
    },
    getFullVersion() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }
};