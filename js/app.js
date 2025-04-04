document.addEventListener('DOMContentLoaded', function() {
    // 画面サイズに応じた適切なカメラ解像度を設定
    const width = Math.min(window.innerWidth, 640);
    const height = Math.min(window.innerHeight, 480);

    // Quaggaの初期化と開始
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector("#interactive"),
            constraints: {
                facingMode: "environment",  // 背面カメラを使用
                width: width,    // 画面幅に合わせる
                height: height   // 画面高さに合わせる
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader"],
            debug: {
                drawBoundingBox: true,  // 追加：検出範囲の表示
                showPattern: true       // 追加：検出パターンの表示
            }
        }
    }, function(err) {
        if (err) {
            console.error("Quaggaの初期化エラー:", err);
            alert("カメラの起動に失敗しました。カメラへのアクセスを許可してください。");
            return;
        }
        console.log("Quagga initialization succeeded");
        Quagga.start();
    });

    // バーコード検出時の処理
    Quagga.onDetected(function(result) {
        if (result.codeResult.code) {
            // 検出されたコードを表示
            document.getElementById('code').textContent = result.codeResult.code;
            // 簡単なビープ音を再生
            navigator.vibrate && navigator.vibrate(200); // バイブレーション（対応端末のみ）
            playBeep();
        }
    });
});

// シンプルなビープ音を生成して再生
function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        oscillator.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
    } catch (e) {
        console.log("音声再生エラー:", e);
    }
}