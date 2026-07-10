import React from "react";
import { useNavigate } from "react-router-dom";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { useRecoveryPhase } from "../hooks/useRecoveryPhase";

export function ForgotPasswordPage(): React.ReactElement {
  const phase = useRecoveryPhase();
  const { executeRequest, executeReset, isLoading, error, sent } =
    useForgotPassword();
  const navigate = useNavigate();

  const handleSubmitRequest = (email: string): void => {
    void executeRequest(email);
  };

  const handleSubmitReset = async (password: string): Promise<void> => {
    const ok = await executeReset(password);
    if (ok) {
      navigate("/login", {
        state: { message: "Contraseña actualizada. Podés iniciar sesión." },
      });
    }
  };

  const title = phase === "reset" ? "Nueva contraseña" : "Recuperar contraseña";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-120 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">SupportFlow</h1>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
        <div>
          <ForgotPasswordForm
            phase={phase}
            onSubmitRequest={handleSubmitRequest}
            onSubmitReset={handleSubmitReset}
            isLoading={isLoading}
            error={error}
            sent={sent}
          />
        </div>
      </div>
    </div>
  );
}
