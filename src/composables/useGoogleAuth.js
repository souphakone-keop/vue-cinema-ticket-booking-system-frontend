const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise = null;

function loadGoogleScript() {
    if (window.google?.accounts?.id) return Promise.resolve();

    if (!scriptLoadPromise) {
        scriptLoadPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
            if (existing) {
                existing.addEventListener("load", () => resolve());
                existing.addEventListener("error", reject);
                return;
            }

            const script = document.createElement("script");
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    return scriptLoadPromise;
}

// Loads the Google Identity Services script, initializes it with the
// configured client ID, and renders the official Google button into
// `buttonEl`. `onCredential(idToken)` is called once the user picks an
// account and Google hands back a credential.
export async function renderGoogleButton(buttonEl, onCredential, options = {}) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
        console.warn(
            "VITE_GOOGLE_CLIENT_ID is not set — Google Sign-In button will not render."
        );
        return;
    }

    await loadGoogleScript();

    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
    });

    window.google.accounts.id.renderButton(buttonEl, {
        theme: "outline",
        size: "large",
        width: buttonEl.offsetWidth || 320,
        ...options,
    });
}
