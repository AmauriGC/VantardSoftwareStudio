import PropTypes from "prop-types";

export default function HttpBadge({ codigo }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
        codigo >= 400 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
      }`}
    >
      {codigo}
    </span>
  );
}

HttpBadge.propTypes = {
  codigo: PropTypes.number.isRequired,
};
