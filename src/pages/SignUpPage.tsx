// src/pages/SignupPage.tsx
import { useState } from "react";
import { UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signupUser, validatePassword } from "../services/authService";
import type { User } from "../types/database";

interface SignupPageProps {
  onSignup: (user: User) => void;
  onLoginClick: () => void;
}

export function SignupPage({ onSignup, onLoginClick }: SignupPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ kayıt sonrası kullanıcı adına göstermek için
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null);

  const passwordValidation = validatePassword(formData.password);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (!passwordValidation.valid) {
      setError("Şifre geçersiz: " + passwordValidation.errors.join(", "));
      return;
    }

    setLoading(true);
    try {
      const result = await signupUser(
        formData.name,
        formData.surname,
        formData.password,
        formData.email // opsiyonel
      );

      setGeneratedUsername(result.generated_username);
      onSignup(result.user);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "Kayıt yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    formData.name.trim() &&
    formData.surname.trim() &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    passwordValidation.valid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Kayıt Ol</h1>
          <p className="text-gray-600 mt-2">Yeni hesap oluşturun</p>
        </div>

        {/* ✅ Kayıt sonrası username bilgilendirme */}
        {generatedUsername && (
          <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold">Kayıt başarılı!</div>
                <div className="mt-1">
                  Kullanıcı adınız:{" "}
                  <span className="font-mono font-semibold">{generatedUsername}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Adınız"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soyadı *</label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => handleChange("surname", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Soyadınız"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400">(opsiyonel)</span>
            </label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Email (varsa)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  formData.password && (passwordValidation.valid ? "border-green-300" : "border-red-300")
                }`}
                placeholder="Şifreniz"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formData.password && passwordValidation.errors.length > 0 && (
              <p className="text-xs text-red-600 mt-1">{passwordValidation.errors[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar *</label>
            <input
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                formData.confirmPassword
                  ? formData.password === formData.confirmPassword
                    ? "border-green-300"
                    : "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Şifrenizi tekrar girin"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm mt-4"
          >
            {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Zaten hesabınız var mı?{" "}
            <button onClick={onLoginClick} className="text-blue-600 hover:text-blue-700 font-medium">
              Giriş yapın
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
