(function () {
  try {
    var alvo = "clubstrategy.clubepirassununga.com.br";
    var suf = ".clubepirassununga.com.br";
    var host = window.location.hostname.toLowerCase();
    if (host === alvo) return;
    if (host === "localhost" || host === "127.0.0.1") return;
    if (host.indexOf(".vercel.app") !== -1 || host.indexOf(".vercel.site") !== -1) return;
    if (host.length > suf.length && host.slice(-suf.length) === suf) {
      window.location.replace("https://" + alvo + "/");
    }
  } catch (e) {}
})();
