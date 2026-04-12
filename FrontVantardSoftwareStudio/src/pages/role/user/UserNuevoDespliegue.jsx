import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileArchive, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import { showSuccessAlert, showErrorAlert } from "../../../kernel/alerts";
import DeploymentService from "./service/DeploymentService";
import UserService from "./service/UserService";

export default function UserNuevoDespliegue() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dominio, setDominio] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const result = await UserService.getProfile();
        if (result.ok) setProfile(result.data);
      } finally {
        setIsProfileLoading(false);
      }
    };

    cargarPerfil();
  }, []);

  const planName = profile?.plan_name || profile?.plan || "-";

  const handleArchivo = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      showErrorAlert({ title: "Formato incorrecto", text: "Solo se aceptan archivos .zip" });
      return;
    }
    setArchivo(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleArchivo(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const normalizedDomain = dominio.trim().toLowerCase();

    if (!dominio.trim()) {
      showErrorAlert({ title: "Falta el dominio", text: "Ingresa un nombre para tu sitio." });
      return;
    }
    if (!archivo) {
      showErrorAlert({ title: "Falta el archivo", text: "Selecciona un archivo .zip con tu sitio." });
      return;
    }

    setIsSubmitting(true);

    const createResult = await DeploymentService.createDeployment({
      domain: normalizedDomain,
      zipFile: archivo,
    });

    if (!createResult.ok) {
      showErrorAlert({
        title: "No se pudo desplegar tu sitio",
        text: createResult.message || "Intenta nuevamente.",
      });
      setIsSubmitting(false);
      return;
    }

    const versionNumber = createResult.data?.version_number;
    const versionText = versionNumber ? `Version ${versionNumber} publicada.` : "Version publicada.";

    setIsSubmitting(false);
    await showSuccessAlert({
      title: "Despliegue creado",
      text: `Tu sitio "${normalizedDomain}.vss.app" fue procesado correctamente. ${versionText}`,
    });
    navigate("/user/despliegue");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Nuevo despliegue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sube tu sitio web estático como archivo ZIP
        </p>
      </div>

      {/* Info del plan */}
      <BaseCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UploadCloud className="h-4 w-4" />
          </div>
          {isProfileLoading ? (
            <p className="text-sm text-gray-700">Cargando información de tu plan...</p>
          ) : (
            <p className="text-sm text-gray-700">
              Tu plan actual es <span className="font-semibold">{planName}</span>.
            </p>
          )}
        </div>
      </BaseCard>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <BaseCard className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Configuración</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="dominio-input" className="text-sm font-medium text-gray-900 block mb-2">
                Nombre del dominio
              </label>
              <div className="flex items-center">
                <input
                  id="dominio-input"
                  type="text"
                  placeholder="mi-sitio"
                  value={dominio}
                  onChange={(e) =>
                    setDominio(e.target.value.replaceAll(/[^a-z0-9-]/gi, "").toLowerCase())
                  }
                  className="h-11 flex-1 rounded-l-md border border-r-0 border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
                />
                <span className="h-11 flex items-center px-3 rounded-r-md border border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0">
                  .vss.app
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Solo letras minúsculas, números y guiones.
              </p>
            </div>
          </div>
        </BaseCard>

        <BaseCard className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Archivo del sitio</h2>
          {/* Zona de arrastre */}
          <button
            type="button"
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer w-full ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={(e) => handleArchivo(e.target.files?.[0])}
            />
            <div className="h-12 w-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Arrastra tu archivo aquí o{" "}
                <span className="text-blue-600">haz clic para seleccionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Solo archivos .zip</p>
            </div>
          </button>

          {/* Archivo seleccionado */}
          {archivo && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileArchive className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{archivo.name}</p>
                  <p className="text-xs text-gray-500">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArchivo(null)}
                className="ml-3 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </BaseCard>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <BaseButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/user/despliegue")}
            disabled={isSubmitting}
          >
            Cancelar
          </BaseButton>
          <BaseButton type="submit" isLoading={isSubmitting}>
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Desplegar sitio
          </BaseButton>
        </div>
      </form>
    </div>
  );
}
