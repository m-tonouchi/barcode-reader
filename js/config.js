const APP_CONFIG = {
    version: {
        major: 1,
        minor: 0,
        patch: new Date().getFullYear() * 10000 + 
              (new Date().getMonth() + 1) * 100 + 
              new Date().getDate()
    },
    getFullVersion() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }
};