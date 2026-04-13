import PropTypes from "prop-types";
import { TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

import BaseCard from "../../../components/BaseCard";
import DeploymentService from "./service/DeploymentService";
import { showErrorAlert } from "../../../kernel/alerts";

function formatearFechaCort(iso) {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" });
}

function TendenciaIndicador({ tendencia }) {
  if (tendencia > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-green-700">
        <ArrowUp className="h-3.5 w-3.5" />
        {`+${tendencia}`}
      </span>
    );
  }
  if (tendencia < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
        <ArrowDown className="h-3.5 w-3.5" />
        {tendencia}
      </span>
    );
  }
  return <span className="text-xs text-gray-400">Sin cambio</span>;
}

TendenciaIndicador.propTypes = {
  tendencia: PropTypes.number.isRequired,
};

export default function UserTrafico() {
  const [traficoData, setTraficoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null);

  useEffect(() => {
    const cargarInicial = async () => {
      try {
        const resultDeploy = await DeploymentService.listMyDeployments({ page: 1, pageSize: 200 });
        if (resultDeploy.ok && resultDeploy.data.length > 0) {
          setDeployments(resultDeploy.data);
          setSelectedDeploymentId(resultDeploy.data[0].id);
        } else {
          setDeployments([]);
          setSelectedDeploymentId(null);
          setTraficoData([]);
        }
      } catch (error) {
        console.error(error);
        showErrorAlert({
          title: "Error",
          text: "No se pudieron cargar los datos de tráfico",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarInicial();
  }, []);

  useEffect(() => {
    const cargarTrafico = async () => {
      if (!selectedDeploymentId) {
        setTraficoData([]);
        return;
      }

      const resultTrafico = await DeploymentService.getTraffic(7, selectedDeploymentId);
      if (resultTrafico.ok) {
        setTraficoData(resultTrafico.data);
      } else {
        showErrorAlert({
          title: "Error",
          text: resultTrafico.message || "No se pudieron cargar los datos de tráfico",
        });
      }
    };

    cargarTrafico();
  }, [selectedDeploymentId]);

  const selectedDeployment = useMemo(
    () => deployments.find((d) => String(d.id) === String(selectedDeploymentId)) ?? null,
    [deployments, selectedDeploymentId]
  );

  const normalizedTraffic = (traficoData || []).map((item, index) => {
    const rawDate = item.date ?? item.fecha ?? item.day ?? null;
    const parsed = rawDate ? new Date(rawDate) : null;
    const isValidDate = parsed && !Number.isNaN(parsed.getTime());

    return {
      key: `${rawDate ?? "sin-fecha"}-${index}`,
      date: isValidDate ? parsed.toISOString() : null,
      visits: Number(item.visits ?? item.visitas ?? 0) || 0,
    };
  });

  // Calcular valores
  const total = normalizedTraffic.reduce((acc, d) => acc + d.visits, 0);
  const maxVisitas = Math.max(
    ...normalizedTraffic.map((d) => d.visits),
    1
  );
  const promedio = normalizedTraffic.length > 0 ? Math.round(total / normalizedTraffic.length) : 0;

  const ultimo = normalizedTraffic?.at?.(-1);
  const penultimo = normalizedTraffic?.at?.(-2);
  const tendencia = ultimo && penultimo ? ultimo.visits - penultimo.visits : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tráfico</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cargando datos de tráfico...</p>
        </div>
        <BaseCard className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600">Cargando datos...</p>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Tráfico</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {selectedDeployment
            ? `Visitas por día de ${selectedDeployment.domain || selectedDeployment.dominio}`
            : "Análisis de tráfico"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Se cuentan solo visitas al sitio publicado. No incluye navegación del panel ni scroll.
        </p>
      </div>

      {deployments.length > 0 ? (
        <BaseCard className="p-4">
          <label htmlFor="trafico-deployment" className="text-xs font-medium text-gray-600 uppercase tracking-wider">
            Sitio desplegado
          </label>
          <select
            id="trafico-deployment"
            className="mt-2 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
            value={selectedDeploymentId ?? ""}
            onChange={(e) => setSelectedDeploymentId(e.target.value)}
          >
            {deployments.map((dep) => (
              <option key={dep.id} value={dep.id}>
                {dep.domain || dep.dominio}
              </option>
            ))}
          </select>
        </BaseCard>
      ) : null}

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total */}
        <BaseCard className="p-5">
          <p className="text-sm font-medium text-gray-600 mb-3">Total últimos 7 días (visitas)</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString("es-MX")}</p>
          <p className="text-xs text-gray-500 mt-1">visitas</p>
        </BaseCard>

        {/* Promedio diario */}
        <BaseCard className="p-5">
          <p className="text-sm font-medium text-gray-600 mb-3">Promedio diario</p>
          <p className="text-2xl font-bold text-gray-900">{promedio.toLocaleString("es-MX")}</p>
          <p className="text-xs text-gray-500 mt-1">visitas / día</p>
        </BaseCard>

        {/* Tendencia */}
        <BaseCard className="p-5">
          <p className="text-sm font-medium text-gray-600 mb-3">Tendencia (ayer vs hoy)</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">
              {Math.abs(tendencia).toLocaleString("es-MX")}
            </p>
            <TendenciaIndicador tendencia={tendencia} />
          </div>
        </BaseCard>
      </div>

      {/* Gráfica visual (barras CSS) */}
      <BaseCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Visitas diarias</h2>
        </div>
        <div className="flex items-end gap-2 h-40">
          {normalizedTraffic.map((d) => {
            const visits = d.visits;
            const altura = maxVisitas > 0 ? Math.round((visits / maxVisitas) * 100) : 0;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <span className="text-xs text-gray-500 font-medium">{visits}</span>
                <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                  <div
                    className="w-full rounded-t-md bg-blue-500 transition-all hover:bg-blue-600"
                    style={{ height: `${altura}%`, minHeight: "4px" }}
                    title={`${visits} visitas`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          {normalizedTraffic.map((d) => (
            <div key={d.key} className="flex-1 min-w-0">
              <p className="text-center text-[10px] text-gray-400 truncate">
                {formatearFechaCort(d.date)}
              </p>
            </div>
          ))}
        </div>
      </BaseCard>

      {/* Tabla detallada */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Detalle por día</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="py-3 px-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visitas
              </th>
              <th className="py-3 px-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % del total
              </th>
            </tr>
          </thead>
          <tbody>
            {[...normalizedTraffic].reverse().map((d) => {
              const visits = d.visits;
              return (
                <tr
                  key={`row-${d.key}`}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-5 text-gray-900">{formatearFechaCort(d.date)}</td>
                  <td className="py-3 px-5 text-right font-medium text-gray-900">
                    {visits.toLocaleString("es-MX")}
                  </td>
                  <td className="py-3 px-5 text-right text-gray-500">
                    {total > 0 ? ((visits / total) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </BaseCard>
    </div>
  );
}
