document.addEventListener('DOMContentLoaded', () => {

    // ----------- Globaller -----------
    window.globalName = "";

    // ----------- Hugging Face Ayarları -----------
    const HF_TOKEN = "HUGGINGFACE_API_TOKEN_BURAYA";
    const HF_MODEL = "joeddav/xlm-roberta-large-xnli";

    const HF_LABEL_MAP = {
        "physical bullying": "fiziksel",
        "verbal bullying": "sozel",
        "cyber bullying": "dijital"
    };

    // ----------- Veritabanı ve UI Ayarları -----------
    const DATABASE = {
        dijital: {
            color: 0x0055ff, cls: 'filter-blue',
            msg: "Tespit: Siber zorbalık (dijital). Lütfen bir yetişkine veya güvenilir kişiye göster."
        },
        fiziksel: {
            color: 0xffcc00, cls: 'filter-yellow',
            msg: "Tespit: Fiziksel zorbalık. Güvende değilsen hemen bir yetişkine haber ver."
        },
        sozel: {
            color: 0xff0000, cls: 'filter-red',
            msg: "Tespit: Sözel zorbalık. Kimseye hakaret edilmesine izin verme; bir yetişkinle paylaş."
        }
    };

    // ----------- Yardımcılar -----------
    function normalizeText(s) {
        return s.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ----------- Login -----------
    window.login = function () {
        const input = document.getElementById('userName');
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        const adviceArea = document.getElementById('adviceArea');

        if (!input || !input.value.trim()) return;

        window.globalName = input.value.trim();
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';
        adviceArea.innerText = `Merhaba ${window.globalName}, Capy seni dinliyor.`;
    };

    const nameInput = document.getElementById('userName');
    if (nameInput) nameInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') window.login();
    });

    // ----------- Hugging Face Analizi -----------
    async function analyzeWithHF(text) {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: text,
                parameters: {
                    candidate_labels: [
                        "physical bullying",
                        "verbal bullying",
                        "cyber bullying"
                    ]
                }
            })
        });

        const data = await response.json();
        return data;
    }

    // ----------- Ana Analiz -----------
    async function analyze() {
        const userInputField = document.getElementById('userInput');
        const adviceArea = document.getElementById('adviceArea');
        const capyImgEl = document.getElementById('capyImage');

        if (!userInputField || !userInputField.value.trim()) return;

        const rawText = userInputField.value.trim();
        const normalized = normalizeText(rawText);

        let hfResult;
        try {
            hfResult = await analyzeWithHF(normalized);
        } catch (e) {
            adviceArea.innerText = "Model şu an cevap vermiyor. Biraz sonra tekrar dene.";
            return;
        }

        if (!hfResult || !hfResult.labels) {
            adviceArea.innerText = "Analiz yapılamadı.";
            return;
        }

        const bestLabel = hfResult.labels[0];
        const confidence = Math.round(hfResult.scores[0] * 1000) / 10;

        const detectedCategory = HF_LABEL_MAP[bestLabel];
        const info = DATABASE[detectedCategory];

        if (capyImgEl) capyImgEl.className = 'footer-img ' + info.cls;

        adviceArea.innerText =
            `${info.msg} (Tespit: ${detectedCategory} zorbalık, Güven: ${confidence}%)`;

        // Log (backend varsa)
        fetch('/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: window.globalName || "",
                text: rawText,
                detected: detectedCategory,
                confidence: confidence,
                source: "huggingface"
            })
        }).catch(() => {});

        userInputField.value = "";
        userInputField.focus();
    }

    // ----------- Eventler -----------
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', window.login);

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.addEventListener('click', analyze);

    const userInput = document.getElementById('userInput');
    if (userInput) userInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') analyze();
    });

});
