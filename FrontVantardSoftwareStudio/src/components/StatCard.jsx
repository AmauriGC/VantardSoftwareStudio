import PropTypes from "prop-types";
import BaseCard from "./BaseCard";

export default function StatCard({ title, value, description, icon }) {
  return (
    <BaseCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </BaseCard>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string,
  icon: PropTypes.node,
};
