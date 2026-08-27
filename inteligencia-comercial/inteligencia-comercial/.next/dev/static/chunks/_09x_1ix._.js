(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/GatilhoNovoUsuario.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GatilhoNovoUsuario
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function GatilhoNovoUsuario() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "GatilhoNovoUsuario.useEffect": ()=>{
            const verificar = {
                "GatilhoNovoUsuario.useEffect.verificar": async ()=>{
                    try {
                        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["criarClienteSupabase"])();
                        if (!supabase) return;
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user?.email) return;
                        await fetch("/api/notificar-novo-usuario", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });
                    } catch  {
                    // Notificação nunca derruba a página.
                    }
                }
            }["GatilhoNovoUsuario.useEffect.verificar"];
            void verificar();
        }
    }["GatilhoNovoUsuario.useEffect"], []);
    return null;
}
_s(GatilhoNovoUsuario, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = GatilhoNovoUsuario;
var _c;
__turbopack_context__.k.register(_c, "GatilhoNovoUsuario");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ManipuladorCodigoAuth.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ManipuladorCodigoAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase/client.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ManipuladorCodigoAuth() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ManipuladorCodigoAuth.useEffect": ()=>{
            const parametros = new URLSearchParams(window.location.search);
            const codigo = parametros.get("code");
            const tipoErro = parametros.get("error_code");
            // Link expirado/invalido: manda direto pro login.
            if (tipoErro === "otp_expired") {
                router.replace("/login");
                return;
            }
            if (!codigo || codigo.length < 10) return;
            const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["criarClienteSupabase"])();
            if (!supabase) return;
            ({
                "ManipuladorCodigoAuth.useEffect": async ()=>{
                    // O proprio cliente Supabase costuma consumir o codigo sozinho ao
                    // carregar (detectSessionInUrl). Tentamos o troca manual e, em todo
                    // caso, checamos se existe sessao valida para seguir adiante.
                    try {
                        await supabase.auth.exchangeCodeForSession(codigo);
                    } catch  {
                    // Codigo ja consumido pela deteccao automatica: segue.
                    }
                    const { data } = await supabase.auth.getUser();
                    if (data?.user) {
                        router.replace("/auth/redefinir");
                    }
                }
            })["ManipuladorCodigoAuth.useEffect"]();
        }
    }["ManipuladorCodigoAuth.useEffect"], [
        router
    ]);
    return null;
}
_s(ManipuladorCodigoAuth, "vQduR7x+OPXj6PSmJyFnf+hU7bg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = ManipuladorCodigoAuth;
var _c;
__turbopack_context__.k.register(_c, "ManipuladorCodigoAuth");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/supabase/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "criarClienteSupabase",
    ()=>criarClienteSupabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createBrowserClient.js [app-client] (ecmascript)");
;
function criarClienteSupabase() {
    const url = ("TURBOPACK compile-time value", "https://gsijlzuusuesekvitdur.supabase.co");
    const chave = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaWpsenV1c3Vlc2Vrdml0ZHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyOTMxMzgsImV4cCI6MjEwMjg2OTEzOH0.DAVcLdOAGviVtPxNwU8jT77qp1WCLiIFa7R8bzwD8Ig");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createBrowserClient"])(url, chave);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_09x_1ix._.js.map