import Swal from "sweetalert2";

const BASE_CUSTOM_CLASS = {
  popup: "rounded-xl",
  title: "text-gray-900",
  htmlContainer: "text-gray-700",
  confirmButton:
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px bg-blue-600 text-white hover:bg-blue-700 px-4 py-2",
  cancelButton:
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px bg-gray-100 text-gray-900 hover:bg-gray-200 px-4 py-2",
};

function buildOptions(options) {
  return {
    buttonsStyling: false,
    customClass: BASE_CUSTOM_CLASS,
    ...options,
  };
}

export function showSuccessAlert({ title = "Listo", text } = {}) {
  return Swal.fire(buildOptions({ icon: "success", title, text }));
}

export function showInfoAlert({ title = "Información", text } = {}) {
  return Swal.fire(buildOptions({ icon: "info", title, text }));
}

export function showErrorAlert({ title = "Ocurrió un error", text } = {}) {
  return Swal.fire(buildOptions({ icon: "error", title, text }));
}

export async function confirmAction({
  title = "¿Estás seguro?",
  text,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
} = {}) {
  const result = await Swal.fire(
    buildOptions({
      icon: "warning",
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: true,
    })
  );

  return Boolean(result.isConfirmed);
}
