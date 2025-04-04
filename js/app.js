'use strict';

document.addEventListener('DOMContentLoaded', function () {
    // 定数の定義
    const BEEP_FREQUENCY = 800;
    const BEEP_DURATION = 100;
    const VIBRATION_DURATION = 200;
    const MAX_CAMERA_WIDTH = 640;
    const MAX_CAMERA_HEIGHT = 480;
    const MAX_RETRY_COUNT = 3;
    const HISTORY_MAX_ITEMS = 10;
    const RETRY_DELAY_BASE = 1000; // リトライ遅延時間の基本値（ミリ秒）

    let retryCount = 0;
    let scanHistory = loadHistory();
    let lastScannedCode = null; // 最後にスキャンされたコードを保持

    // 履歴の表示更新をデバウンス
    const debouncedUpdateHistory = debounce(updateHistoryDisplay, 100);

    // バージョン情報の表示（最初に実行）
    displayVersionInfo();

    function displayVersionInfo() {
        const versionElement = document.getElementById('version');
        if (versionElement) {
            versionElement.textContent = `v${APP_CONFIG.getFullVersion()}`;
        } else {
            console.error('バージョン情報の表示要素が見つかりません');
        }
    }

    // 履歴の読み込み
    function loadHistory() {
        const saved = localStorage.getItem('barcodeHistory');
        return saved ? JSON.parse(saved) : [];
    }

    // 履歴の保存
    function saveHistory(code) {
        if (typeof code !== 'string' || !code.trim()) {
            console.error('無効なバーコード値です:', code);
            return;
        }
        // 重複チェック
        if (code === lastScannedCode) {
            console.log("重複したコードのため、履歴に保存しませんでした。");
            return;
        }
        lastScannedCode = code;

        // 履歴の追加
        scanHistory.unshift({
            code: code,
            timestamp: new Date().toLocaleString()
        });

        // 履歴の最大数を超えた場合の処理
        if (scanHistory.length > HISTORY_MAX_ITEMS) {
            scanHistory.pop(); // 末尾の要素を削除
        }

        localStorage.setItem('barcodeHistory', JSON.stringify(scanHistory));
        debouncedUpdateHistory();
    }

    // 履歴の表示更新
    function updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        if (!historyList) {
            console.error("履歴リストの要素が見つかりません: #history-list");
            return;
        }

        historyList.innerHTML = scanHistory
            .map(item => `<li>${item.code} (${item.timestamp})</li>`)
            .join('');
    }

    // デバウンス関数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ローディング表示の制御
    function toggleLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
    }

    // カメラ設定を初期化する関数
    function initializeCameraSettings() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // iOS向けの制約を設定
        const constraints = {
            facingMode: {
                exact: "environment"  // 背面カメラを強制
            },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
        };

        return {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector("#interactive"),
                constraints: constraints,
                area: {
                    top: "0%",
                    right: "0%",
                    left: "0%",
                    bottom: "0%"
                }
            },
            decoder: {
                readers: ["code_39_reader"],
                debug: {
                    drawBoundingBox: true,
                    showPattern: true
                },
                config: {
                    code39Reader: {
                        checksum: false,
                        skipStart: true,
                        strict: false
                    }
                },
                multiple: false  // 複数コードの同時読み取りを無効化
            },
            locate: true,  // バーコードの位置検出を有効化
            locator: {
                patchSize: "medium",
                halfSample: true
            }
        };
    }

    // Quaggaの初期化と開始（リトライ機能付き）
    function initializeQuagga() {
        toggleLoading(true);

        Quagga.init(initializeCameraSettings(), function (err) {
            if (err) {
                handleInitializationError(err);
                return;
            }

            retryCount = 0;
            console.log("Quagga initialization succeeded");
            Quagga.start();
        });
    }

    // エラーハンドリング専用の関数を追加
    function handleInitializationError(err) {
        console.error("Quaggaの初期化エラー:", err);
        
        // エラーメッセージの詳細化
        let errorMessage = 'カメラの起動に失敗しました。\n\n';
        
        switch (err.name) {
            case 'NotAllowedError':
            case 'SecurityError':
                errorMessage += 'カメラへのアクセスが拒否されました。\nブラウザの設定からカメラへのアクセスを許可してください。';
                break;
            case 'NotFoundError':
                errorMessage += 'カメラが見つかりません。\nデバイスにカメラが接続されているか確認してください。';
                break;
            case 'NotReadableError':
                errorMessage += 'カメラにアクセスできません。\n他のアプリケーションがカメラを使用していないか確認してください。';
                break;
            default:
                errorMessage += `エラー: ${err.name}: ${err.message}`;
        }
        
        if (retryCount < MAX_RETRY_COUNT) {
            retryCount++;
            const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
            console.log(`リトライ実行 (${retryCount}/${MAX_RETRY_COUNT}) (遅延: ${delay}ms)`);
            setTimeout(initializeQuagga, delay);
            return;
        }

        alert(errorMessage);
        toggleLoading(false);
    }

    // バーコード検出時の処理
    Quagga.onDetected(function (result) {
        if (result.codeResult && result.codeResult.code) {
            const codeElement = document.getElementById('code');
            if (codeElement) {
                const code = result.codeResult.code;
                codeElement.textContent = code;
                saveHistory(code);

                if (navigator.vibrate) {
                    navigator.vibrate(VIBRATION_DURATION);
                }
                playBeep();
            } else {
                console.error("コード表示要素が見つかりません: #code");
            }
        }
    });

    // シンプルなビープ音を生成して再生
    function playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.connect(audioContext.destination);
            oscillator.frequency.value = BEEP_FREQUENCY;
            oscillator.start();
            setTimeout(() => oscillator.stop(), BEEP_DURATION);
        } catch (e) {
            console.error("音声再生エラー:", e);
            alert("音声の再生に失敗しました。");
        }
    }

    // Quaggaが開始されたらローディングを非表示にする
    Quagga.onProcessed(function(result) {
        if (result) {
            toggleLoading(false);
        }
    });

    // クリーンアップ関数の定義
    function cleanup() {
        Quagga.stop();
        toggleLoading(false);
    }

    // ページ遷移時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);

    // 画面回転時のカメラリセット
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            cleanup();
            initializeQuagga();
        }, 100);
    });

    // 初期化の実行
    initializeQuagga();
    updateHistoryDisplay();
});
