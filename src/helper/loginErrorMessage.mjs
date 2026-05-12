export function getLoginErrorMessage(error, apiBaseUrl = "") {
  const response = error?.response;
  const data = response?.data;
  const message = data?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (typeof data === "string") {
    const trimmed = data.trim().toLowerCase();
    if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
      const baseUrlInfo = apiBaseUrl ? ` (${apiBaseUrl})` : "";
      return `Login API mengembalikan HTML, bukan JSON${baseUrlInfo}. Periksa VITE_URL_LOC dan pastikan backend API yang aktif.`;
    }
  }

  if (response?.status === 404) {
    const baseUrlInfo = apiBaseUrl ? ` (${apiBaseUrl})` : "";
    return `Endpoint login tidak ditemukan${baseUrlInfo}. Periksa VITE_URL_LOC dan pastikan backend berjalan di URL tersebut.`;
  }

  if (typeof response?.statusText === "string" && response.statusText.trim()) {
    return response.statusText;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Login gagal. Periksa koneksi backend dan konfigurasi API.";
}
