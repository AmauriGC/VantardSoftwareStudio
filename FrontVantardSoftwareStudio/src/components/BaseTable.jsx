import { useState } from "react";
import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_DEFAULT = 10;
const SKELETON_ROW_IDS = ["sk-0", "sk-1", "sk-2", "sk-3", "sk-4"];

/**
 * BaseTable — tabla con columnas configurables, paginación y estado de carga.
 *
 * columns: Array de { key, header, render?, align? }
 *   - key:    identificador único de columna (se usa como React key si no hay render)
 *   - header: texto del encabezado
 *   - render: (row) => ReactNode  —  opcional; si no se define usa row[key]
 *   - align:  "left" | "center" | "right"  —  default "left"
 *
 * rows:       array de objetos de datos
 * loading:    muestra esqueleto de carga cuando es true
 * emptyText:  mensaje cuando no hay filas (default "Sin resultados.")
 * pageSize:   filas por página (default 10, 0 = sin paginación)
 */
export default function BaseTable({
  columns = [],
  rows = [],
  loading = false,
  emptyText = "Sin resultados.",
  pageSize = PAGE_SIZE_DEFAULT,
  page: controlledPage,
  totalRows,
  onPageChange,
}) {
  const isServerPaginated =
    typeof controlledPage === "number" &&
    typeof totalRows === "number" &&
    typeof onPageChange === "function";

  const [page, setPage] = useState(1);
  const totalCount = isServerPaginated ? totalRows : rows.length;

  const paginated = pageSize > 0;
  const totalPages = paginated ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const clientPage = paginated ? Math.min(Math.max(page, 1), totalPages) : 1;
  const currentPage = isServerPaginated ? controlledPage : clientPage;

  let visibleRows = rows;
  if (!isServerPaginated && paginated) {
    visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  const skeletonCount = pageSize > 0 ? Math.min(pageSize, 5) : 5;

  function renderBody() {
    if (loading) {
      return (
        <>
          {SKELETON_ROW_IDS.slice(0, skeletonCount).map((skId) => (
            <tr key={skId} className="border-b border-gray-100 last:border-0">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  <div className="h-4 rounded bg-gray-100 animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </>
      );
    }

    if (visibleRows.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} className="py-10 text-center text-sm text-gray-400">
            {emptyText}
          </td>
        </tr>
      );
    }

    return (
      <>
        {visibleRows.map((row, rowIdx) => (
          <tr
            key={row.id ?? `row-${rowIdx}`}
            className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`py-3 px-4 text-gray-600 ${alignClass[col.align] ?? alignClass.left}`}
              >
                {col.render ? col.render(row) : (row[col.key] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    alignClass[col.align] ?? alignClass.left
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderBody()}
          </tbody>
        </table>
      </div>

      {paginated && totalPages > 1 && !loading && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            {totalCount === 0
              ? "0 resultados"
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                  (currentPage - 1) * pageSize + visibleRows.length,
                  totalCount
                )} de ${totalCount}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (isServerPaginated) onPageChange(Math.max(1, currentPage - 1));
                else setPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-700 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                if (isServerPaginated) onPageChange(Math.min(totalPages, currentPage + 1));
                else setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

BaseTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      render: PropTypes.func,
      align: PropTypes.oneOf(["left", "center", "right"]),
    })
  ),
  rows: PropTypes.array,
  loading: PropTypes.bool,
  emptyText: PropTypes.string,
  pageSize: PropTypes.number,
  page: PropTypes.number,
  totalRows: PropTypes.number,
  onPageChange: PropTypes.func,
};
